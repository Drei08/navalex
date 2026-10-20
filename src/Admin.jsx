import { useEffect, useState } from 'react'
import { FaSignOutAlt, FaTrashAlt, FaPrint, FaLock, FaCalendarDay, FaFilePdf, FaDatabase, FaEnvelope } from 'react-icons/fa'
import { isRemote, watchUser, login, logout, subscribeAllBookings, deleteBooking } from './bookings.js'
import { buildMonthlyPdf, downloadBackupJson, sendReportByEmail, reportEmailEnabled, pdfName, monthLabel } from './backup.js'
import NewBooking from './NewBooking.jsx'
import './styles-admin-append.css'

const todayIso = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) }
const fmt = s => s.split('-').reverse().join('/')
const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })




function Brand() {
  return <div className="dev-brand">dev<b>A<span className="flip">L</span>A</b></div>
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = email.trim() !== '' && pass !== ''

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await login(email.trim(), pass) }
    catch { setErr('E-mail ou senha incorretos.') }
    setBusy(false)
  }

  return (
    <div className="dev">
      <div className="dev-card">
        <Brand />
        <p className="dev-muted dev-center">Painel de Sistema</p>
        <form onSubmit={submit} className="dev-form">
          <label>E-mail<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Senha<input type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} required /></label>
          {err && <p className="dev-err">{err}</p>}
          <button className={'dev-btn dev-btn-outline' + (ready ? ' on' : '')} disabled={busy}>
  <FaLock /> {busy ? 'Entrando...' : 'Entrar'}
</button>
        </form>
        <a className="dev-link" href="/home">Voltar ao site</a>
      </div>
    </div>)
}

// Relatório mensal em PDF (baixar ou enviar por e-mail) e backup completo em JSON
function BackupBox({ list, user }) {
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [status, setStatus] = useState(null) // { ok, text }
  const [busy, setBusy] = useState(false)

  const inMonth = list.filter(b => b.date.startsWith(month))

  function downloadPdf() {
    if (!month) return
    buildMonthlyPdf(month, inMonth).save(pdfName(month))
    setStatus({ ok: true, text: `PDF de ${monthLabel(month)} baixado.` })
  }

  function downloadJson() {
    downloadBackupJson(list)
    setStatus({ ok: true, text: `Backup baixado (${list.length} agendamentos). Guarde o arquivo em um lugar seguro.` })
  }

  async function emailPdf() {
    if (!month) return
    setBusy(true); setStatus(null)
    try {
      await sendReportByEmail(user, month, buildMonthlyPdf(month, inMonth))
      setStatus({ ok: true, text: `Relatório de ${monthLabel(month)} enviado por e-mail.` })
    } catch (e) {
      setStatus({ ok: false, text: 'Não foi possível enviar: ' + e.message })
    }
    setBusy(false)
  }

  return (
    <section className="dev-backup no-print">
      <h2>Relatório e backup</h2>
      <div className="dev-bar">
        <label>Mês<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
        <button className="dev-btn sm" onClick={downloadPdf} disabled={!month}><FaFilePdf /> Baixar PDF do mês</button>
        {reportEmailEnabled &&
          <button className="dev-ghost" onClick={emailPdf} disabled={!month || busy}><FaEnvelope /> {busy ? 'Enviando...' : 'Enviar PDF por e-mail'}</button>}
      </div>
      {status && <p className={status.ok ? 'dev-ok' : 'dev-err'}>{status.text}</p>}
    </section>
  )
}

function Panel({ user }) {
  const [list, setList] = useState([])
  const [day, setDay] = useState(todayIso())
  const [msg, setMsg] = useState('')
  useEffect(() => subscribeAllBookings(setList), [])
  

  const shown = day ? list.filter(b => b.date === day) : list
  const total = shown.reduce((sum, b) => sum + (b.price || 0), 0)
  

  async function remove(b) {
    if (!window.confirm(`Excluir o agendamento de ${b.name} (${fmt(b.date)} às ${b.time})?`)) return
    setMsg('')
    try { await deleteBooking(b) }
    catch { setMsg('Não foi possível excluir. Confira se este e-mail é o autorizado nas regras do Firestore.') }
  }

  return (
    <div className="dev">
      <header className="dev-top no-print">
        <Brand />
        <div className="dev-user"><span>{user.email}</span>
          <button className="dev-ghost" onClick={logout}><FaSignOutAlt /> Sair</button></div>
      </header>

      <main className="dev-panel">
        <h1>Agendamentos</h1>

        <NewBooking list={list} user={user} day={day} onAdded={d => setDay(d)} />
        <BackupBox list={list} user={user} />

        <div className="dev-bar no-print">
          <label>Data<input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
          <button className="dev-ghost" onClick={() => setDay('')}><FaCalendarDay /> Ver todos</button>
          <button className="dev-ghost" onClick={() => setDay(todayIso())}>Hoje</button>
          <button className="dev-btn sm" onClick={() => window.print()}><FaPrint /> Imprimir</button>
        </div>

        <p className="dev-print-title">Agendamentos {day ? '- ' + fmt(day) : '(todos)'}</p>
        {msg && <p className="dev-err">{msg}</p>}

        {shown.length
          ? <ul className="dev-list">{shown.map(b => (
              <li key={b.date + b.time} className="dev-row">
                <div className="dev-time">{b.time}</div>
                <div className="dev-info"><b>{b.name}</b><small>{[b.service, !day && fmt(b.date)].filter(Boolean).join(' · ')}</small></div>
                <div className="dev-price">{b.price ? money(b.price) : '—'}</div>
                <button className="dev-del no-print" onClick={() => remove(b)}><FaTrashAlt /> Excluir</button>
              </li>))}</ul>
          : <p className="dev-empty">Nenhum agendamento {day ? 'nesta data' : 'por enquanto'}.</p>}

          <p className="dev-muted no-print">Atualiza em tempo real. Ao excluir, o horário volta a ficar livre no site.</p>

        <div className="dev-totals">
          <div><span>Agendamentos</span><b>{shown.length}</b></div>
          <div className="big"><span>Total</span><b>{money(total)}</b></div>
        </div>
      </main>
    </div>)
}

export default function Admin() {
  const [user, setUser] = useState(undefined)
  useEffect(() => watchUser(setUser), [])

  if (!isRemote) return <div className="dev"><div className="dev-card"><Brand /><p className="dev-muted dev-center">Configure o Firebase no arquivo .env para usar o painel.</p></div></div>
  if (user === undefined) return <div className="dev"><p className="dev-muted dev-center">Carregando...</p></div>
  return user ? <Panel user={user} /> : <Login />
}
