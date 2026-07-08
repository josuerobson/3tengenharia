// src/lib/defectReportPdf.ts
// Gera um PDF (client-side) com os detalhes de um relato de defeito/avaria,
// incluindo a foto anexada, para impressão ou anexo em processos internos.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface DefectReportPdfInput {
  assetTag: string
  description: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  location?: string | null
  issueDescription: string
  reportedAt: string | Date
  /** Data URL (base64) da foto do defeito, se houver. Deve ser JPEG. */
  photoDataUrl?: string | null
}

const PAGE_WIDTH = 595.28 // A4 em pontos (72dpi)
const PAGE_HEIGHT = 841.89
const MARGIN_X = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Quebra uma string em linhas que cabem em `maxWidth`, usando a fonte/tamanho informados. */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export async function generateDefectReportPdf(data: DefectReportPdfInput): Promise<void> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - 50

  const ensureSpace = (needed: number) => {
    if (y - needed < 40) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - 50
    }
  }

  page.drawText('3T Engenharia — Relatório de Avaria', {
    x: MARGIN_X,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 8
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 0.75,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 22

  const addField = (label: string, value: string) => {
    ensureSpace(16)
    const labelText = `${label}: `
    page.drawText(labelText, { x: MARGIN_X, y, size: 11, font: fontBold })
    const labelWidth = fontBold.widthOfTextAtSize(labelText, 11)
    const lines = wrapText(value, fontRegular, 11, CONTENT_WIDTH - labelWidth)
    lines.forEach((line, i) => {
      page.drawText(line, { x: MARGIN_X + labelWidth, y: y - i * 14, size: 11, font: fontRegular })
    })
    y -= 14 * lines.length + 4
  }

  addField('Código Patrimonial', data.assetTag || '—')
  addField('Descrição do Bem', data.description || '—')
  if (data.brand || data.model) {
    addField('Marca / Modelo', [data.brand, data.model].filter(Boolean).join(' '))
  }
  if (data.serialNumber) addField('Nº de Série', data.serialNumber)
  if (data.location) addField('Localização', data.location)
  addField('Data do Relato', new Date(data.reportedAt).toLocaleString('pt-BR'))

  y -= 10
  ensureSpace(20)
  page.drawText('Descrição do Problema:', { x: MARGIN_X, y, size: 11, font: fontBold })
  y -= 16
  const descLines = wrapText(data.issueDescription || '—', fontRegular, 11, CONTENT_WIDTH)
  for (const line of descLines) {
    ensureSpace(14)
    page.drawText(line, { x: MARGIN_X, y, size: 11, font: fontRegular })
    y -= 14
  }
  y -= 10

  if (data.photoDataUrl) {
    try {
      const imgBytes = dataUrlToBytes(data.photoDataUrl)
      const jpg = await pdfDoc.embedJpg(imgBytes)
      const maxImgWidth = 260
      const scale = maxImgWidth / jpg.width
      const imgWidth = jpg.width * scale
      const imgHeight = jpg.height * scale

      ensureSpace(imgHeight + 20)
      page.drawText('Foto do Defeito:', { x: MARGIN_X, y, size: 11, font: fontBold })
      y -= 16
      ensureSpace(imgHeight)
      page.drawImage(jpg, { x: MARGIN_X, y: y - imgHeight, width: imgWidth, height: imgHeight })
      y -= imgHeight + 10
    } catch (err) {
      console.error('Erro ao inserir foto no PDF:', err)
    }
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const safeTag = (data.assetTag || 'bem').replace(/[^a-zA-Z0-9-_]+/g, '-')
  const link = document.createElement('a')
  link.href = url
  link.download = `relato-defeito-${safeTag}-${Date.now()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
