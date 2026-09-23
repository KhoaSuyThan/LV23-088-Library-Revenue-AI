/**
 * Tiện ích xuất file PDF và In tem nhãn mã vạch tiêu chuẩn thư viện (AC4)
 * Hỗ trợ xuất file .pdf (jsPDF) và in trực tiếp qua hộp thoại máy in (window.print)
 * 
 * ĐẶC BIỆT: Sử dụng Canvas Engine độ phân giải cao (~300 DPI) để nhúng vào PDF,
 * đảm bảo 100% hiển thị tiếng Việt có dấu hoàn hảo (Unicode), không bao giờ bị lỗi phông!
 */

import { jsPDF } from 'jspdf';
import { encodeCode128B, generateBarcodeSvg } from './barcodeGenerator';

/**
 * Vẽ một con tem mã vạch hoàn chỉnh lên thẻ Canvas độ phân giải cao (~300 DPI)
 * Đảm bảo 100% hỗ trợ tiếng Việt có dấu chuẩn đẹp mắt.
 */
function createLabelCanvas(copy, book, widthMm, heightMm, libraryName) {
  const canvas = document.createElement('canvas');
  // Hệ số 3.5x cho mật độ điểm ảnh ~300 DPI khi in ấn tem nhãn cực kỳ sắc nét
  const scale = 3.5;
  const pxWidth = Math.round(widthMm * 3.78 * scale);
  const pxHeight = Math.round(heightMm * 3.78 * scale);

  canvas.width = pxWidth;
  canvas.height = pxHeight;
  const ctx = canvas.getContext('2d');

  // 1. Nền trắng tinh
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pxWidth, pxHeight);

  // 2. Viền tem nhãn bo góc nhẹ
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2 * scale;
  const radius = 3 * scale;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(2 * scale, 2 * scale, pxWidth - 4 * scale, pxHeight - 4 * scale, radius);
  } else {
    ctx.rect(2 * scale, 2 * scale, pxWidth - 4 * scale, pxHeight - 4 * scale);
  }
  ctx.stroke();

  // 3. Tên Thư viện (Hỗ trợ tiếng Việt có dấu chuẩn 100%)
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.round(2.2 * 3.78 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(libraryName || 'SMARTLIB AI - THƯ VIỆN ĐẠI HỌC', pxWidth / 2, 3.2 * 3.78 * scale);

  // 4. Tên đầu sách (Hỗ trợ tiếng Việt có dấu chuẩn 100%)
  ctx.fillStyle = '#475569';
  ctx.font = `normal ${Math.round(1.9 * 3.78 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  let title = book?.title || 'Tài liệu Thư viện';
  if (title.length > 38) {
    title = title.substring(0, 35) + '...';
  }
  ctx.fillText(title, pxWidth / 2, 6.2 * 3.78 * scale);

  // 5. Mã vạch Code 128 vẽ vector siêu nét
  const bits = encodeCode128B(copy.barcode);
  if (bits && bits.length > 0) {
    const marginX = 4 * 3.78 * scale;
    const barcodeY = 9.8 * 3.78 * scale;
    const barcodeW = pxWidth - marginX * 2;
    const barcodeH = (heightMm - 17.5) * 3.78 * scale;
    const moduleW = barcodeW / bits.length;

    ctx.fillStyle = '#0f172a';
    let inBar = false;
    let barStart = 0;

    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === 1 && !inBar) {
        inBar = true;
        barStart = i;
      } else if (bits[i] === 0 && inBar) {
        inBar = false;
        const bx = marginX + barStart * moduleW;
        const bw = (i - barStart) * moduleW;
        ctx.fillRect(bx, barcodeY, bw, barcodeH);
      }
    }
    if (inBar) {
      const bx = marginX + barStart * moduleW;
      const bw = (bits.length - barStart) * moduleW;
      ctx.fillRect(bx, barcodeY, bw, barcodeH);
    }
  }

  // 6. Chuỗi text mã vạch dưới chân tem
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.round(2.3 * 3.78 * scale)}px "JetBrains Mono", Consolas, "Courier New", monospace`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(`* ${copy.barcode} *`, pxWidth / 2, pxHeight - 2.8 * 3.78 * scale);

  return canvas.toDataURL('image/png');
}

/**
 * Xuất file PDF tem mã vạch theo khổ in Decal A4 hoặc khổ nhãn cuộn 50x30mm
 * @param {Array} copies - Danh sách bản sao cần in [{ barcode, status }]
 * @param {Object} book - Thông tin đầu sách { title, code, author }
 * @param {Object} options - Tùy chọn in (khổ giấy, số cột,...)
 */
export async function exportBarcodeLabelsPdf(copies, book, options = {}) {
  if (!copies || copies.length === 0) return;

  const {
    format = 'a4', // 'a4' hoặc 'thermal' (50x30mm)
    columns = 3,
    libraryName = 'SMARTLIB AI - THƯ VIỆN ĐẠI HỌC',
  } = options;

  if (format === 'thermal') {
    // Khổ tem nhiệt đơn 50mm x 30mm (Dành cho máy in tem nhãn cuộn Xprinter / TSC / Zebra)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 30]
    });

    copies.forEach((copy, idx) => {
      if (idx > 0) doc.addPage([50, 30], 'landscape');

      const imgData = createLabelCanvas(copy, book, 50, 30, libraryName);
      doc.addImage(imgData, 'PNG', 0, 0, 50, 30, undefined, 'FAST');
    });

    doc.save(`Tem_MaVach_${book?.code || 'Book'}_Thermal_${Date.now()}.pdf`);
    return;
  }

  // Khổ giấy A4 (Decal 3 cột tiêu chuẩn thư viện - 210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 10;
  const marginY = 12;
  const labelWidth = (pageWidth - marginX * 2 - (columns - 1) * 4) / columns; // ~60mm
  const labelHeight = 32; // mm
  const rowsPerPage = 8;
  const labelsPerPage = columns * rowsPerPage;

  copies.forEach((copy, index) => {
    const itemOnPage = index % labelsPerPage;

    if (index > 0 && itemOnPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    const col = itemOnPage % columns;
    const row = Math.floor(itemOnPage / columns);

    const x = marginX + col * (labelWidth + 4);
    const y = marginY + row * (labelHeight + 3);

    const imgData = createLabelCanvas(copy, book, labelWidth, labelHeight, libraryName);
    doc.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');
  });

  doc.save(`Tem_MaVach_${book?.code || 'Book'}_A4_${Date.now()}.pdf`);
}

/**
 * Mở cửa sổ in trực tiếp (Print Dialog) với CSS căn lề tem chuẩn
 */
export function openPrintDialog(copies, book) {
  if (!copies || copies.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Vui lòng cho phép popup trình duyệt để mở cửa sổ in tem mã vạch.');
    return;
  }

  const labelHtmls = copies.map((copy) => {
    const svgContent = generateBarcodeSvg(copy.barcode, {
      width: 220,
      height: 60,
      fontSize: 11,
      margin: 4
    });

    return `
      <div class="print-label">
        <div class="label-header">SMARTLIB AI - THƯ VIỆN ĐẠI HỌC</div>
        <div class="label-book-title">${book?.title || 'Tài liệu Thư viện'}</div>
        <div class="label-barcode-svg">${svgContent}</div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>In Tem Mã Vạch - ${book?.title || 'SmartLib AI'}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #fff;
            color: #0f172a;
            padding: 10px;
          }
          .labels-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .print-label {
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
            page-break-inside: avoid;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .label-header {
            font-size: 9.5px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .label-book-title {
            font-size: 9px;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            margin-bottom: 4px;
          }
          .label-barcode-svg svg {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            height: auto;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelHtmls}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
