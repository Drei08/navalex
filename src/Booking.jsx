import { useMemo, useState } from 'react'
import { FaArrowLeft, FaWhatsapp, FaCut, FaCheckCircle } from 'react-icons/fa'
import { WA_NUMBER, ADDRESS } from './config.js'

const services = ['Corte masculino', 'Degradê', 'Barba', 'Corte + Barba', 'Sobrancelha']
const times = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00']
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)

export default function Booking() {
  const days = useMemo(() => Array.from({ length: 21 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() + k); return d }).filter(d => d.getDay() !== 0), [])
  const [f, setF] = useState({ service: '', date: '', time: '', name: '', phone: '' })
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const step = !f.service ? 1 : !f.date ? 2 : !f.time ? 3 : 4
  const fmt = s => s && s.split('-').reverse().join('/')

  function send(e) {
    e.preventDefault()
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 10) return setErr('Informe seu nome e um telefone válido.')
    const msg = `Olá, Alex! Gostaria de agendar:\n• Serviço: ${f.service}\n• Data: ${fmt(f.date)}\n• Horário: ${f.time}\n• Nome: ${f.name}\n• Telefone: ${f.phone}`
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="book">
      <header className="book-top"><a href="#inicio" className="back"><FaArrowLeft /> Voltar ao site</a>
        <div className="logo" ><a className="logo" href="#inicio"><FaCut /> Alex Navalex</a></div></header>
      <main className="book-main">
        <h1>Agende seu horário</h1><p className="sub">Escolha serviço, dia e horário. A confirmação é feita pelo WhatsApp.</p>
        <div className="steps">{['Serviço', 'Data', 'Horário', 'Dados'].map((t, k) => <span key={t} className={k + 1 <= step ? 'on' : ''}>{k + 1}. {t}</span>)}</div>

        <h3>1. Serviço</h3>
        <div className="chips">{services.map(s => <button key={s} className={f.service === s ? 'on' : ''} onClick={() => set('service', s)}>{s}</button>)}</div>

        <h3>2. Data</h3>
        <div className="days">{days.map(d => { const v = iso(d); return (
          <button key={v} className={f.date === v ? 'on' : ''} onClick={() => set('date', v)}>
            <small>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small>
            <b>{d.getDate()}</b><small>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></button>) })}</div>

        <h3>3. Horário</h3>
        <div className="chips">{times.map(t => <button key={t} className={f.time === t ? 'on' : ''} onClick={() => set('time', t)}>{t}</button>)}</div>

        <h3>4. Seus dados</h3>
        <form onSubmit={send}>
          <input placeholder="Seu nome" value={f.name} onChange={e => set('name', e.target.value)} />
          <input placeholder="Seu telefone (com DDD)" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} />
          {err && <p className="err">{err}</p>}
          {f.service && f.date && f.time && <div className="sum"><FaCheckCircle /> {f.service} · {fmt(f.date)} às {f.time}</div>}
          <button className="btn wa" disabled={step < 4}><FaWhatsapp /> Confirmar pelo WhatsApp</button>
        </form>
        
        <p className="note">· Segunda a Sexta, das 9h às 18h</p>
        <p className="note">· Sábado 9h às 13h</p>
        <p className="note">· {ADDRESS}</p>
      </main>
    </div>)
}
