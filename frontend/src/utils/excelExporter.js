/**
 * Tiện ích xuất dữ liệu sang Microsoft Excel (.xls SpreadsheetML) và CSV chuẩn UTF-8
 * Đảm bảo các bảng tính mở trên Microsoft Excel có:
 * - Hàng cột thẳng tắp, không bị dồn cột
 * - Đường viền ô (borders) rõ nét, màu sắc tiêu đề trang nhã
 * - Định dạng số tiền (VNĐ), ngày tháng, tỷ lệ phần trăm chuẩn
 * - Độ rộng cột tự động hoặc cấu hình vừa vặn
 * - Hỗ trợ nhiều Sheet cho các báo cáo đa phân hệ
 */

// Hàm thoát ký tự đặc biệt cho XML Spreadsheet
function escapeXml(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Xuất file Excel định dạng Microsoft SpreadsheetML (.xls) với đầy đủ định dạng thẩm mỹ
 * @param {Object} options
 * @param {string} options.fileName - Tên tệp xuất (ví dụ: 'Bao_Cao_Thu_Vien.xls')
 * @param {Array<Object>} options.sheets - Danh sách các sheet cần xuất
 */
export function exportExcelWorkbook({ fileName = 'Bao_Cao.xls', sheets = [] }) {
  if (!sheets || sheets.length === 0) {
    throw new Error('Cần ít nhất một sheet dữ liệu để xuất Excel.');
  }

  // Định nghĩa các Style chuẩn trong XML Spreadsheet
  const stylesXml = `
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="TitleStyle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#1E3A8A"/>
    </Style>
    <Style ss:ID="SubtitleStyle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#475569"/>
    </Style>
    <Style ss:ID="SectionHeader">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0F766E"/>
    </Style>
    <Style ss:ID="HeaderCol">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="DataLeft">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
    </Style>
    <Style ss:ID="DataCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
    </Style>
    <Style ss:ID="DataRight">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
    </Style>
    <Style ss:ID="DataCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
      <NumberFormat ss:Format="#,##0&quot; đ&quot;"/>
    </Style>
    <Style ss:ID="DataNumber">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="SummaryTotal">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1E293B"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E293B"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SummaryCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1E293B"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E293B"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0&quot; đ&quot;"/>
    </Style>
  </Styles>`;

  // Xây dựng các Worksheets
  let worksheetsXml = '';

  for (const sheet of sheets) {
    const sheetName = escapeXml(sheet.name || 'Sheet1');
    const cols = sheet.columns || [];
    const rows = sheet.rows || [];
    const title = sheet.title;
    const subtitles = sheet.subtitles || [];
    const summaryRows = sheet.summaryRows || [];

    let tableRows = '';

    // Dòng Tiêu đề Báo cáo (Title)
    if (title) {
      tableRows += `
      <Row ss:Height="26">
        <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>
      </Row>`;
    }

    // Các dòng Phụ đề (Subtitles / Metadata)
    if (Array.isArray(subtitles)) {
      for (const sub of subtitles) {
        tableRows += `
        <Row ss:Height="18">
          <Cell ss:StyleID="SubtitleStyle"><Data ss:Type="String">${escapeXml(sub)}</Data></Cell>
        </Row>`;
      }
      if (subtitles.length > 0) {
        // Dòng trống đệm
        tableRows += `<Row ss:Height="10"></Row>`;
      }
    }

    // Dòng Tiêu đề các Cột (Header)
    tableRows += `<Row ss:Height="24">`;
    for (const col of cols) {
      tableRows += `
        <Cell ss:StyleID="HeaderCol">
          <Data ss:Type="String">${escapeXml(col.header || '')}</Data>
        </Cell>`;
    }
    tableRows += `</Row>`;

    // Các dòng Dữ liệu (Data Rows)
    for (const row of rows) {
      tableRows += `<Row ss:Height="20">`;
      for (let i = 0; i < cols.length; i++) {
        const colDef = cols[i] || {};
        const cellVal = row[i];
        const align = colDef.align || 'left';
        const type = colDef.type || 'string';

        let styleId = 'DataLeft';
        let dataType = 'String';
        let xmlVal = '';

        if (type === 'currency') {
          styleId = 'DataCurrency';
          dataType = 'Number';
          xmlVal = (typeof cellVal === 'number') ? cellVal : (parseFloat(String(cellVal).replace(/[^0-9.-]/g, '')) || 0);
        } else if (type === 'number') {
          styleId = 'DataNumber';
          dataType = 'Number';
          xmlVal = (typeof cellVal === 'number') ? cellVal : (parseFloat(String(cellVal).replace(/[^0-9.-]/g, '')) || 0);
        } else if (align === 'center') {
          styleId = 'DataCenter';
          dataType = 'String';
          xmlVal = escapeXml(cellVal ?? '');
        } else if (align === 'right') {
          styleId = 'DataRight';
          dataType = 'String';
          xmlVal = escapeXml(cellVal ?? '');
        } else {
          styleId = 'DataLeft';
          dataType = 'String';
          xmlVal = escapeXml(cellVal ?? '');
        }

        tableRows += `<Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${xmlVal}</Data></Cell>`;
      }
      tableRows += `</Row>`;
    }

    // Dòng Tổng cộng / Tổng kết nếu có
    for (const sumRow of summaryRows) {
      tableRows += `<Row ss:Height="22">`;
      for (let i = 0; i < cols.length; i++) {
        const colDef = cols[i] || {};
        const cellVal = sumRow[i];
        const isCur = colDef.type === 'currency';
        const styleId = isCur ? 'SummaryCurrency' : 'SummaryTotal';

        if (isCur && typeof cellVal === 'number') {
          tableRows += `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${cellVal}</Data></Cell>`;
        } else {
          tableRows += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(cellVal ?? '')}</Data></Cell>`;
        }
      }
      tableRows += `</Row>`;
    }

    // Cấu hình độ rộng các cột
    let colsXml = '';
    for (const col of cols) {
      const width = col.width || 100;
      colsXml += `<Column ss:Width="${width}"/>\n`;
    }

    worksheetsXml += `
    <Worksheet ss:Name="${sheetName}">
      <Table>
        ${colsXml}
        ${tableRows}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <Selected/>
        <FreezePanes/>
        <FrozenNoSplit/>
        <SplitHorizontal>${(title ? 1 : 0) + (subtitles.length > 0 ? subtitles.length + 1 : 0) + 1}</SplitHorizontal>
        <TopRowBottomPane>${(title ? 1 : 0) + (subtitles.length > 0 ? subtitles.length + 1 : 0) + 1}</TopRowBottomPane>
        <ActivePane>2</ActivePane>
      </WorksheetOptions>
    </Worksheet>`;
  }

  // Toàn bộ cấu trúc XML Spreadsheet 2003
  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>SmartLib AI System</Author>
    <Created>${new Date().toISOString()}</Created>
    <Company>Thư viện Thông minh SmartLib AI</Company>
  </DocumentProperties>
  ${stylesXml}
  ${worksheetsXml}
</Workbook>`;

  // Tải file xuống máy người dùng với MIME type Excel
  const blob = new Blob([workbookXml], {
    type: 'application/vnd.ms-excel;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const finalFileName = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  link.setAttribute('download', finalFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất file CSV chuẩn UTF-8 có chỉ thị phân tách cột (sep=,) cho Microsoft Excel
 * Giúp mở trực tiếp bằng Excel không bao giờ bị dồn cột
 * @param {Object} options
 * @param {string} options.fileName - Tên file tải về (ví dụ: 'Du_Lieu.csv')
 * @param {Array<string>} options.headers - Mảng tiêu đề cột
 * @param {Array<Array<any>>} options.rows - Mảng các dòng dữ liệu
 */
export function exportCsvFile({ fileName = 'Du_Lieu.csv', headers = [], rows = [] }) {
  // Hàm bao bọc ô cho CSV theo chuẩn RFC 4180
  const formatCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((r) => r.map(formatCell).join(','));

  // UTF-8 BOM + Chỉ thị phân tách của Excel 'sep=,'
  const csvContent = '\uFEFFsep=,\r\n' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const finalFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  link.setAttribute('download', finalFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
