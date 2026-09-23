/**
 * Module tiện ích giải mã mã vạch và QR Code từ tệp ảnh (Client-side Image Barcode Decoder).
 * Sử dụng giải pháp công nghệ kép:
 * 1. Native Web API 'BarcodeDetector' (Chromium Chrome/Edge - siêu tốc bằng GPU/C++).
 * 2. Fallback sang thư viện chuẩn '@zxing/library' (Tương thích 100% mọi trình duyệt).
 */

import { BrowserMultiFormatReader } from '@zxing/library';

// Khởi tạo một instance ZXing Reader dùng chung để tối ưu hiệu năng
let zxingReaderInstance = null;
function getZxingReader() {
  if (!zxingReaderInstance) {
    zxingReaderInstance = new BrowserMultiFormatReader();
  }
  return zxingReaderInstance;
}

/**
 * Giải mã chuỗi mã vạch hoặc mã QR từ một tệp ảnh (File hoặc Blob).
 * @param {File|Blob} imageFile - Tệp hình ảnh chứa mã vạch
 * @returns {Promise<{success: boolean, barcode?: string, format?: string, message?: string}>}
 */
export async function decodeBarcodeFromImage(imageFile) {
  if (!imageFile) {
    return { success: false, message: 'Vui lòng cung cấp tệp ảnh hợp lệ.' };
  }

  // Tạo URL tạm cho file ảnh
  const objectUrl = URL.createObjectURL(imageFile);

  try {
    // -------------------------------------------------------------
    // CHIẾN LƯỢC 1: Ưu tiên Native BarcodeDetector API (Siêu nhanh)
    // -------------------------------------------------------------
    if ('BarcodeDetector' in window) {
      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        const desiredFormats = [
          'code_128',
          'code_39',
          'ean_13',
          'ean_8',
          'qr_code',
          'data_matrix',
          'upc_a',
          'upc_e',
          'codabar'
        ].filter((f) => supportedFormats.includes(f));

        const detector = new window.BarcodeDetector({
          formats: desiredFormats.length > 0 ? desiredFormats : supportedFormats
        });

        // Tải ảnh vào ImageBitmap để BarcodeDetector nhận diện trực tiếp
        const imageBitmap = await createImageBitmap(imageFile);
        const detectedBarcodes = await detector.detect(imageBitmap);

        if (detectedBarcodes && detectedBarcodes.length > 0) {
          const first = detectedBarcodes[0];
          const rawValue = (first.rawValue || '').trim();
          if (rawValue) {
            return {
              success: true,
              barcode: rawValue,
              format: first.format || 'code_128'
            };
          }
        }
      } catch (nativeErr) {
        // Nếu BarcodeDetector gặp lỗi định dạng hoặc không nhận diện được, tiếp tục sang ZXing
        console.warn('BarcodeDetector native không nhận diện được, chuyển sang ZXing fallback:', nativeErr);
      }
    }

    // -------------------------------------------------------------
    // CHIẾN LƯỢC 2: Fallback sang @zxing/library (Hỗ trợ 100% trình duyệt)
    // -------------------------------------------------------------
    try {
      const reader = getZxingReader();
      const result = await reader.decodeFromImageUrl(objectUrl);
      if (result && result.getText()) {
        const text = result.getText().trim();
        return {
          success: true,
          barcode: text,
          format: result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : 'barcode'
        };
      }
    } catch (zxingErr) {
      // Không đọc được mã vạch qua ZXing
    }

    // Nếu cả 2 phương thức đều không tìm thấy
    return {
      success: false,
      message: 'Không tìm thấy mã vạch hoặc mã QR hợp lệ trong ảnh tải lên. Vui lòng thử ảnh rõ nét hơn hoặc nhập mã trực tiếp.'
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Lỗi xử lý tệp ảnh.'
    };
  } finally {
    // Thu hồi bộ nhớ Object URL
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
    if (item.type.indexOf('image') !== -1) {
      return item.getAsFile();
    }
  }
  return null;
}
