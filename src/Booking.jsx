import { useEffect, useMemo, useState } from 'react'
import { FaArrowLeft, FaWhatsapp, FaCut, FaCheckCircle, FaRegClock } from 'react-icons/fa'
import { WA_NUMBER } from './config.js'
import { subscribeBookings, addBooking, isRemote } from './bookings.js'
import { SERVICES as services, slotsOfDay, joinTimes, durationOf, startOptions, slotsFor } from './schedule.js'

const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
const fmt = s => s.split('-').reverse().join('/')
const fmtShort = s => s.split('-').reverse().slice(0, 2).join('/')
const fmtDur = m => m % 60 === 0 ? m / 60 + 'h' : m + ' min'

export default function Booking() {
  const days = useMemo(() => Array.from({ length: 21 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() + k); return d }).filter(d => d.getDay() !== 0), [])
  const [f, setF] = useState({ service: [], date: '', time: '', name: '', phone: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [booked, setBooked] = useState([])
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Ao mudar os serviços, só limpa o horário escolhido se a duração mudou (ex.: de 30 min para 1h)
  const toggle = name => setF(p => {
    const service = p.service.includes(name) ? p.service.filter(n => n !== name) : [...p.service, name]
    return { ...p, service, time: durationOf(service) === durationOf(p.service) ? p.time : '' }
  })
  useEffect(() => subscribeBookings(setBooked), [])

  const now = new Date()
  const taken = t => booked.some(b => b.date === f.date && b.time === t)
  const past = t => f.date === iso(now) && t <= now.toTimeString().slice(0, 5)
  const step = !f.service.length ? 1 : !f.date ? 2 : !f.time ? 3 : 4
  const total = f.service.reduce((sum, n) => sum + (services.find(s => s.name === n)?.price ?? 0), 0)

  const daySlots = slotsOfDay(f.date) // sábado só até 12:30 (ver schedule.js)

  // Duração do que foi escolhido: 30 min normalmente; 1h para Corte + Barba + Sobrancelha.
  // Serviço de 1h mostra só horários cheios (08:00, 09:00...) e precisa da meia hora seguinte livre.
  const duration = durationOf(f.service)
  const busy = booked.filter(b => b.date === f.date).map(b => b.time)
  const options = startOptions(daySlots, busy, duration)
  const off = t => !f.date || past(t) || !options.find(o => o.time === t)?.free

  // Lista "Horários já agendados": um serviço de 1h aparece numa linha só, com os horários que ocupa (09:00 e 09:30)
  const bookedList = booked.filter(b => !b.ref).map(b => {
    const extra = booked.filter(x => x.ref === `${b.date}_${b.time}`).length
    return { ...b, hours: joinTimes(slotsFor(b.time, 30 * (1 + extra))) }
  })

  async function send(e) {
    e.preventDefault()
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 10) return setErr('Informe seu nome e um telefone válido.')
    if (off(f.time)) return setErr('Esse horário não está mais disponível.')
    setSaving(true); setErr('')
    const w = window.open('', '_blank')
    try {
      await addBooking({ name: f.name.trim(), date: f.date, time: f.time, service: f.service.join(' + '), price: total })
      const hora = duration > 30 ? `${f.time} (duração de ${fmtDur(duration)})` : f.time
      const msg = `Olá, Alex! Gostaria de agendar:\n• Serviço: ${f.service.join(', ')}\n• Valor: ${money(total)}\n• Data: ${fmt(f.date)}\n• Horário: ${hora}\n• Nome: ${f.name}\n• Telefone: ${f.phone}`
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
      if (w) w.location.href = url; else location.href = url
      set('time', '')
    } catch (x) {
      if (w) w.close()
      setErr(x.message === 'taken' ? 'Esse horário acabou de ser ocupado. Escolha outro.' : 'Não foi possível salvar o agendamento. Tente de novo.')
    }
    setSaving(false)
  }

  
  return (
    <div className="book">

      <header className="book-top">
        <a href="/" className="back"><FaArrowLeft /> Voltar ao site</a>
        <div className="logo">
          <a className="logo" href="/"><FaCut />Alex Navalex</a>
        </div>
      </header>

      <main className="book-main">
        <h1>Agende seu horário</h1>
        <p className="sub">Escolha serviço, dia e horário. A confirmação é feita pelo WhatsApp.</p>
        <div className="steps">{['Serviço', 'Data', 'Horário', 'Dados'].map((t, k) => <span key={t} className={k + 1 <= step ? 'on' : ''}>{k + 1}. {t}</span>)}</div>

        <h3>1. Serviço</h3>
        <p className="sub">Você pode escolher mais de um serviço.</p>
        <div className="chips">{services.map(s => (
          <button key={s.name} className={'svc ' + (f.service.includes(s.name) ? 'on' : '')} onClick={() => toggle(s.name)}>
            <span>{s.name}</span>
            <small>{money(s.price)}</small>
          </button>))}
        </div>

        <h3>2. Data</h3>
        <div className="days">{days.map(d => { const v = iso(d); return (
          <button key={v} className={f.date === v ? 'on' : ''} onClick={() => setF(p => ({ ...p, date: v, time: '' }))}>
            <small>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small>
            <b>{d.getDate()}</b><small>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></button>) })}</div>

        <h3>3. Horário</h3>
        {!f.date && <p className="sub">Escolha uma data para ver os horários livres.</p>}
        {duration > 30 && <p className="sub">Este serviço leva 1h: ao escolher um horário, ele reserva também a meia hora seguinte.</p>}
        <div className="chips">{options.map(({ time: t }) => (
          <button key={t} type="button" disabled={off(t)} className={(f.time === t ? 'on ' : '') + (taken(t) ? 'busy' : '')} onClick={() => set('time', t)}>
            <span className="hora">{t}</span>{taken(t) && <small className="agendado">Agendado</small>}
          </button>))}</div>

        <h3>4. Seus dados</h3>
        <form onSubmit={send}>
          <input placeholder="Seu nome" value={f.name} onChange={e => set('name', e.target.value)} />
          <input placeholder="Seu telefone (com DDD)" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} />
          {err && <p className="err">{err}</p>}
          {f.service.length > 0 && f.date && f.time && (
            <div className="sum"><FaCheckCircle /> {f.service.join(' + ')} · {money(total)} · {fmt(f.date)} às {duration > 30 ? joinTimes(slotsFor(f.time, duration)) : f.time}</div>
          )}
          <p className="note">Para confirmação do agendamento, envie a mensagem pelo WhatsApp.</p>
          <button className="btn wa" disabled={step < 4 || saving}><FaWhatsapp /> {saving ? 'Salvando...' : 'Confirmar pelo WhatsApp'}</button>
        </form>
        

        <section className="booked">
          <h3><FaRegClock /> Horários já agendados</h3>
          {bookedList.length
            ? <ul>{bookedList.map(b => <li key={b.date + b.time}><span>{fmtShort(b.date)} às {b.hours}</span><b>{b.name}</b></li>)}</ul>
            : <p>Nenhum horário ocupado por enquanto. Todos estão livres.</p>}
          {!isRemote && <p className="note">Modo de teste: os agendamentos só aparecem neste navegador.</p>}
        </section>
      </main>

      <footer>© {new Date().getFullYear()} <span className="dev-logo">dev<b>A<i className="flip">L</i>A</b></span> · Todos os Direitos Reservados</footer>
    </div>)
}
