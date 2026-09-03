export function exportToExcel<T extends object>(
  data: T[],
  headersMap: Record<string, string>,
  filename: string,
  sheetTitle: string
): void {
  if (!data.length) return;

  const keys = Object.keys(headersMap);

  const formatValue = (key: string, value: unknown): string => {
    if (!value) return '—';
    if (key === 'created_at' || key === 'fecha') {
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    return String(value);
  };

  const headerRows = keys
    .map(
      (key) =>
        `<th style="background-color: #005eb8; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; text-align: left;">${headersMap[key]}</th>`
    )
    .join('');

  const bodyRows = data
    .map((row, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      const record = row as Record<string, unknown>;
      const cells = keys
        .map((key) => {
          const val = formatValue(key, record[key]);
          return `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-family: Arial, sans-serif; font-size: 11pt;">${val}</td>`;
        })
        .join('');
      return `<tr style="background-color: ${bgColor};">${cells}</tr>`;
    })
    .join('');

  const excelHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetTitle}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:AutoFilter/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
      <h2 style="color: #0f172a; font-family: Arial, sans-serif;">${sheetTitle}</h2>
      <p style="color: #64748b; font-size: 9pt; font-family: Arial, sans-serif;">Generado desde Intranet Hanna Instruments · ${new Date().toLocaleDateString('es-CO')}</p>
      <table>
        <thead>
          <tr>${headerRows}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}