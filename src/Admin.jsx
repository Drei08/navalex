import { useEffect, useState } from 'react'
import { FaSignOutAlt, FaTrashAlt, FaPrint, FaLock, FaCalendarDay } from 'react-icons/fa'
import { isRemote, watchUser, login, logout, subscribeAllBookings, deleteBooking } from './bookings.js'
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
          <button className="dev-btn" disabled={busy}><FaLock /> {busy ? 'Entrando...' : 'Entrar'}</button>
        </form>
        <a className="dev-link" href="/">Voltar ao site</a>
      </div>
    </div>)
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
        <p className="dev-muted no-print">Atualiza em tempo real. Ao excluir, o horário volta a ficar livre no site.</p>

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
