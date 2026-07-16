// src/lib/reportExport.ts
// Exportação genérica (PDF e Excel) reutilizável por qualquer relatório do hub
// "Relatórios". Tudo gerado no navegador — mesma filosofia do resto do projeto
// (nada sobe para um servidor de arquivos).

export interface ReportColumn {
  key: string
  label: string
}

export type ReportRow = Record<string, string | number | null | undefined>

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

// ── PDF (tabela paginada, orientação paisagem) ────────────────────────────────
export async function exportReportToPdf(
  title: string,
  columns: ReportColumn[],
  rows: ReportRow[],
): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const PAGE_WIDTH = 841.89 // A4 paisagem (72dpi)
  const PAGE_HEIGHT = 595.28
  const MARGIN = 32
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
  const ROW_HEIGHT = 18
  const FONT_SIZE = 8

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const colWidth = CONTENT_WIDTH / columns.length

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  const drawHeader = () => {
    page.drawText(title, { x: MARGIN, y, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
    y -= 10
    page.drawText(`Gerado em ${new Date().toLocaleString('pt-BR')}`, {
      x: MARGIN,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    })
    y -= 18
  }

  const drawTableHeader = () => {
    columns.forEach((col, i) => {
      page.drawText(col.label, {
        x: MARGIN + i * colWidth,
        y,
        size: FONT_SIZE,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      })
    })
    y -= 6
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    y -= ROW_HEIGHT - 6
  }

  drawHeader()
  drawTableHeader()

  for (const row of rows) {
    if (y < MARGIN + ROW_HEIGHT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
      drawTableHeader()
    }
    columns.forEach((col, i) => {
      const text = formatCell(row[col.key]).slice(0, 40)
      page.drawText(text, {
        x: MARGIN + i * colWidth,
        y,
        size: FONT_SIZE,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      })
    })
    y -= ROW_HEIGHT
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  downloadBlob(blob, `${slugify(title)}-${Date.now()}.pdf`)
}

// ── Excel ──────────────────────────────────────────────────────────────────────
export async function exportReportToExcel(
  title: string,
  columns: ReportColumn[],
  rows: ReportRow[],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(title.slice(0, 31))

  sheet.columns = columns.map((col) => ({ header: col.label, key: col.key, width: 20 }))
  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    sheet.addRow(columns.map((col) => row[col.key] ?? ''))
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `${slugify(title)}-${Date.now()}.xlsx`)
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
