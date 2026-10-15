// Relatório mensal em PDF + backup em JSON + envio por e-mail (opcional).
// O PDF é gerado no navegador (jsPDF). O envio por e-mail precisa de um servidor
// (veja api/send-report.js), porque o navegador não pode guardar a chave do provedor de e-mail.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const NEGOCIO = 'Relatório de agendamentos' // troque pelo nome da barbearia, se quiser
const LARANJA = [255, 106, 0]

const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
const fmtDate = s => s.split('-').reverse().join('/')
const byDate = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)

export const reportEmailEnabled = Boolean(import.meta.env.VITE_REPORT_ENDPOINT)
export const pdfName = month => `relatorio-agendamentos-${month}.pdf`

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Monta o PDF do mês. month = "YYYY-MM"; bookings = agendamentos desse mês. */
export function buildMonthlyPdf(month, bookings) {
  const rows = [...bookings].sort(byDate)
  const total = rows.reduce((s, b) => s + (b.price || 0), 0)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(`${NEGOCIO} - ${monthLabel(month)}`, 14, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 24)

  doc.setTextColor(0); doc.setFontSize(11)
  doc.text(`Agendamentos no mês: ${rows.length}`, 14, 33)
  doc.text(`Faturamento no mês: ${brl(total)}`, 14, 39)

  // Resumo por serviço
  const byService = {}
  rows.forEach(b => {
    const k = b.service || 'Sem serviço'
    byService[k] = byService[k] || { n: 0, v: 0 }
    byService[k].n += 1
    byService[k].v += b.price || 0
  })
  const services = Object.entries(byService).sort((a, b) => b[1].v - a[1].v)
  if (services.length) {
    autoTable(doc, {
      startY: 45,
      head: [['Serviço', 'Qtd.', 'Total']],
      body: services.map(([k, v]) => [k, String(v.n), brl(v.v)]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: LARANJA, textColor: 0 },
      columnStyles: { 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 35 } },
    })
  }

  // Lista completa
  const startY = (services.length ? (doc.lastAutoTable?.finalY ?? 80) : 40) + 10
  if (rows.length) {
    autoTable(doc, {
      startY,
      head: [['Data', 'Hora', 'Cliente', 'Serviço', 'Valor']],
      body: rows.map(b => [fmtDate(b.date), b.time, b.name, b.service || '-', brl(b.price)]),
      foot: [['', '', '', 'Total', brl(total)]],
      showFoot: 'lastPage',
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: LARANJA, textColor: 0 },
      footStyles: { fillColor: [235, 235, 235], textColor: 0 },
      columnStyles: { 4: { halign: 'right' } },
    })
  } else {
    doc.setFontSize(11); doc.text('Nenhum agendamento neste mês.', 14, startY)
  }

  // Numeração das páginas
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140)
    doc.text(`Página ${i} de ${pages}`, 196, 290, { align: 'right' })
  }
  return doc
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Backup completo (todos os agendamentos) em JSON: serve para restaurar dados, diferente do PDF. */
export function downloadBackupJson(all) {
  const stamp = new Date().toISOString().slice(0, 10)
  const body = { geradoEm: new Date().toISOString(), total: all.length, agendamentos: all }
  download(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }), `backup-agendamentos-${stamp}.json`)
}

const toBase64 = buf => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Envia o PDF para o servidor (api/send-report.js), que manda o e-mail. */
export async function sendReportByEmail(user, month, doc) {
  const token = await user.getIdToken()
  const res = await fetch(import.meta.env.VITE_REPORT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ month, filename: pdfName(month), pdfBase64: toBase64(doc.output('arraybuffer')) }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `erro ${res.status}`)
}
