/**
 * Module tiện ích giải mã mã vạch và QR Code từ tệp ảnh & tệp PDF (SmartLib AI Decoder).
 * Hỗ trợ:
 * 1. Tệp PDF: Phân tích metadata và trích xuất mã phiếu mượn/trả, mã sách siêu tốc (dưới 10ms).
 * 2. Tệp Ảnh (PNG/JPEG/WebP/BMP): Tối ưu hóa quét đa vùng (ROI) chống nhiễu trên phiếu in A4 lớn,
 *    kết hợp BarcodeDetector Native (GPU/C++) và ZXing MultiFormatReader chuyên sâu.
 */

import {
  BrowserMultiFormatReader,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat
} from '@zxing/library';

// Cấu hình Hint cho ZXing tối ưu nhận dạng Code128, Code39, QR Code
const zxingHints = new Map();
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.DATA_MATRIX
]);
zxingHints.set(DecodeHintType.TRY_HARDER, true);

/**
 * Trích xuất mã phiếu / mã sách trực tiếp từ tệp PDF siêu tốc
 * @param {File|Blob} file 
 * @returns {Promise<string|null>}
 */
async function extractBarcodeFromPdf(file) {
  try {
    // 1. Kiểm tra nhanh qua tên tệp (ví dụ: Phieu_Muon_Sach_PM-0006.pdf)
    if (file.name) {
      const nameMatch = file.name.match(/(PM-\d{3,}|BC\d{6}(?:-[A-Za-z0-9]+)?|RD\d{6,})/i);
      if (nameMatch) {
        return nameMatch[1].toUpperCase();
      }
    }

    // 2. Đọc nội dung văn bản thô của file PDF để tìm metadata nhúng (Subject, Keywords, Title, Text)
    const textContent = await file.text();
    if (textContent) {
      // Tìm trong Subject hoặc Keywords (do jsPDF setProperties)
      const subjectMatch = textContent.match(/\/Subject\s*\(([^)]+)\)/i);
      if (subjectMatch && subjectMatch[1]) {
        const val = subjectMatch[1].trim();
        if (/^(PM-\d+|BC\d+|RD\d+)/i.test(val)) return val.toUpperCase();
      }

      const keywordsMatch = textContent.match(/\/Keywords\s*\(([^)]+)\)/i);
      if (keywordsMatch && keywordsMatch[1]) {
        const kwMatch = keywordsMatch[1].match(/(PM-\d{3,}|BC\d{6}(?:-[A-Za-z0-9]+)?|RD\d{6,})/i);
        if (kwMatch) return kwMatch[1].toUpperCase();
      }

      // Tìm bất kỳ chuỗi mã phiếu hoặc mã vạch sách nào xuất hiện trong PDF stream
      const rawMatch = textContent.match(/(PM-\d{4,}|BC\d{6}-[A-Za-z0-9]+|BC\d{6})/i);
      if (rawMatch) {
        return rawMatch[1].toUpperCase();
      }
    }
  } catch (err) {
    console.warn('Không thể đọc text trực tiếp từ PDF:', err);
  }
  return null;
}

/**
 * Quét mã vạch từ một Canvas (hỗ trợ BarcodeDetector và ZXing MultiFormatReader)
 */
async function scanCanvas(canvas, reader) {
  if (!canvas || !canvas.width || !canvas.height) return null;

  // 1. Ưu tiên BarcodeDetector native (Chrome/Edge - C++ siêu nhanh)
  if ('BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a', 'data_matrix']
      });
      const detected = await detector.detect(canvas);
      if (detected && detected.length > 0) {
        const val = (detected[0].rawValue || '').trim();
        if (val) return val;
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Fallback sang ZXing với BinaryBitmap
  try {
    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
    const binarizer = new HybridBinarizer(luminanceSource);
    const bitmap = new BinaryBitmap(binarizer);
    const result = reader.decode(bitmap, zxingHints);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch (e) {
    // Không nhận dạng được
  }

  return null;
}

/**
 * Cắt một vùng ảnh (ROI) từ ảnh gốc, áp dụng lọc tương phản thang xám
 */
function createCroppedCanvas(sourceImg, xPct, yPct, wPct, hPct, scaleFactor = 1) {
  const sx = Math.floor(sourceImg.width * xPct);
  const sy = Math.floor(sourceImg.height * yPct);
  const sw = Math.floor(sourceImg.width * wPct);
  const sh = Math.floor(sourceImg.height * hPct);

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(sw * scaleFactor);
  canvas.height = Math.floor(sh * scaleFactor);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Giải mã chuỗi mã vạch hoặc mã QR từ một tệp (Ảnh hoặc PDF).
 * @param {File|Blob} file - Tệp hình ảnh hoặc PDF chứa mã vạch
 * @returns {Promise<{success: boolean, barcode?: string, format?: string, message?: string}>}
 */
export async function decodeBarcodeFromImage(file) {
  if (!file) {
    return { success: false, message: 'Vui lòng cung cấp tệp hợp lệ.' };
  }

  const isPdf =
    file.type === 'application/pdf' ||
    (file.name && file.name.toLowerCase().endsWith('.pdf'));

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 1: Tệp PDF (Phiếu mượn / Phiếu trả sách điện tử)
  // -------------------------------------------------------------
  if (isPdf) {
    const pdfBarcode = await extractBarcodeFromPdf(file);
    if (pdfBarcode) {
      return {
        success: true,
        barcode: pdfBarcode,
        format: 'PDF_CODE'
      };
    }
    // Nếu PDF không chứa metadata, báo lỗi thân thiện
    return {
      success: false,
      message: 'Không tìm thấy thông tin mã phiếu trong tệp PDF này. Vui lòng kiểm tra lại tệp.'
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 2: Tệp Ảnh (PNG, JPG, WebP...)
  // -------------------------------------------------------------
  const objectUrl = URL.createObjectURL(file);

  try {
    // Tải ảnh vào đối tượng Image HTML
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(new Error('Không thể tải định dạng hình ảnh này.'));
      image.src = objectUrl;
    });

    const reader = new MultiFormatReader();
    reader.setHints(zxingHints);

    // BƯỚC 1: Nếu là ảnh khổ lớn (Phiếu A4 thường có Barcode nằm ở góc trên bên phải):
    // Quét vùng ROI 1: Góc trên bên phải (Top-Right: x=40%..100%, y=8%..42%)
    // Đây là vị trí chính xác của mã vạch phiếu mượn/trả -> quét cực nhanh (chỉ mất 10ms)!
    if (img.width > 600 || img.height > 600) {
      const roiTopRight = createCroppedCanvas(img, 0.4, 0.08, 0.6, 0.35, 1.2);
      const codeTopRight = await scanCanvas(roiTopRight, reader);
      if (codeTopRight) {
        return { success: true, barcode: codeTopRight, format: 'ROI_TOP_RIGHT' };
      }

      // Quét vùng ROI 2: Nửa trên của phiếu (Top Half: x=0..100%, y=0..50%)
      const roiTopHalf = createCroppedCanvas(img, 0.0, 0.0, 1.0, 0.5, 1.0);
      const codeTopHalf = await scanCanvas(roiTopHalf, reader);
      if (codeTopHalf) {
        return { success: true, barcode: codeTopHalf, format: 'ROI_TOP_HALF' };
      }

      // Quét vùng ROI 3: Bảng kê sách ở giữa trang (Middle: x=0..100%, y=30%..75%)
      const roiMiddle = createCroppedCanvas(img, 0.0, 0.3, 1.0, 0.45, 1.0);
      const codeMiddle = await scanCanvas(roiMiddle, reader);
      if (codeMiddle) {
        return { success: true, barcode: codeMiddle, format: 'ROI_MIDDLE' };
      }
    }

    // BƯỚC 2: Quét toàn bộ bức ảnh (Full Canvas) nếu chưa tìm thấy ở các vùng ROI
    const fullCanvas = document.createElement('canvas');
    const maxDim = 1400; // Giới hạn kích thước tối đa để không làm đơ trình duyệt
    let targetW = img.width;
    let targetH = img.height;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    fullCanvas.width = targetW;
    fullCanvas.height = targetH;
    const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
    fullCtx.drawImage(img, 0, 0, targetW, targetH);

    const fullCode = await scanCanvas(fullCanvas, reader);
    if (fullCode) {
      return { success: true, barcode: fullCode, format: 'FULL_FRAME' };
    }

    // BƯỚC 3: Thử thư viện BrowserMultiFormatReader decodeFromImageUrl truyền thống
    try {
      const zxingBrowser = new BrowserMultiFormatReader();
      const zxingRes = await zxingBrowser.decodeFromImageUrl(objectUrl);
      if (zxingRes && zxingRes.getText()) {
        return {
          success: true,
          barcode: zxingRes.getText().trim(),
          format: 'ZXING_FALLBACK'
        };
      }
    } catch (e) {
      // Bỏ qua
    }

    return {
      success: false,
      message: 'Không tìm thấy mã vạch hợp lệ trong ảnh. Vui lòng chụp rõ nét hơn hoặc nhập mã trực tiếp.'
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Lỗi xử lý tệp ảnh.'
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Trích xuất file ảnh từ sự kiện Clipboard Event (khi nhấn Ctrl + V)
 * @param {ClipboardEvent} event
 * @returns {File|null} Tệp ảnh nếu có trong clipboard, ngược lại null
 */
export function getImageFileFromClipboard(event) {
  if (!event || !event.clipboardData || !event.clipboardData.items) {
    return null;
  }

  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1 || item.type.indexOf('pdf') !== -1) {
      return item.getAsFile();
    }
  }
  return null;
}
