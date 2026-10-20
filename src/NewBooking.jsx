import { useMemo, useState } from 'react'
import { FaPlus, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { addBooking } from './bookings.js'
import { SERVICES, slotsOfDay, joinTimes, durationOf, startOptions, slotsFor } from './schedule.js'
import './styles-admin-agendamento.css'

const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
const fmt = s => s.split('-').reverse().join('/')
const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Painel do Alex: adiciona um atendimento manualmente (cliente que chegou sem agendar).
 * Mostra todos os horários do dia: os ocupados ficam bloqueados e os livres podem ser escolhidos,
 * inclusive os que já passaram (o site público não deixa agendar horário que já passou).
 * Grava em "agendamentos", então entra no histórico, no resumo diário e no relatório mensal.
 *   list: todos os agendamentos (os mesmos do painel)   day: data que está aberta no painel
 *   onAdded(date): chamado depois de salvar, para o painel mostrar o dia do novo agendamento
 */
export default function NewBooking({ list, day, onAdded }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(day || iso(new Date()))
  const [service, setService] = useState([])
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  const duration = durationOf(service)
  const total = service.reduce((sum, n) => sum + (SERVICES.find(s => s.name === n)?.price ?? 0), 0)

  // horários ocupados na data escolhida (um serviço de 1h ocupa dois)
  const busy = useMemo(
    () => list.filter(b => b.date === date).flatMap(b => slotsFor(b.time, b.duration || 30)),
    [list, date])
  const free = new Map(startOptions(slotsOfDay(date), busy, duration, { hourlyOnly: false }).map(o => [o.time, o.free]))
  const now = new Date()
  const passed = t => date === iso(now) && t <= now.toTimeString().slice(0, 5)

  function openForm() { setDate(day || iso(new Date())); setTime(''); setMsg(null); setOpen(true) }

  function toggle(n) {
    const next = service.includes(n) ? service.filter(x => x !== n) : [...service, n]
    if (durationOf(next) !== duration) setTime('')   // mudou a duração: o horário escolhido pode não caber mais
    setService(next)
  }

  async function save(e) {
    e.preventDefault()
    if (!service.length) return setMsg({ ok: false, text: 'Escolha o serviço.' })
    if (!time) return setMsg({ ok: false, text: 'Escolha o horário.' })
    if (!name.trim()) return setMsg({ ok: false, text: 'Informe o nome do cliente.' })
    setSaving(true); setMsg(null)
    try {
      await addBooking({ name: name.trim(), date, time, service: service.join(' + '), price: total })
      setMsg({ ok: true, text: `${name.trim()} adicionado em ${fmt(date)} às ${joinTimes(slotsFor(time, duration))}.` })
      onAdded?.(date)
      setService([]); setTime(''); setName('')
    } catch (x) {
      setMsg({ ok: false, text: x.message === 'taken' ? 'Esse horário acabou de ser ocupado. Escolha outro.' : 'Não foi possível salvar. Veja o erro no Console (F12).' })
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <div className="dev-bar no-print">
        <button className="dev-btn sm" onClick={openForm}><FaPlus /> Novo agendamento</button>
      </div>)
  }

  return (
    <section className="dev-new no-print">
      <div className="dev-new-head">
        <h2>Novo agendamento</h2>
        <button type="button" className="dev-ghost" onClick={() => setOpen(false)}>Fechar</button>
      </div>

      <form className="dev-form" onSubmit={save}>
        <div className="dev-new-row">
          <label>Data
            <input type="date" value={date} required onChange={e => { setDate(e.target.value); setTime('') }} />
          </label>
          <label className="dev-name">Nome do cliente
            <input value={name} placeholder="Nome" onChange={e => setName(e.target.value)} />
          </label>
        </div>

        <div>
          <h3>Serviço</h3>
          <div className="dev-chips">{SERVICES.map(s => (
            <button type="button" key={s.name} className={'dev-chip' + (service.includes(s.name) ? ' on' : '')} onClick={() => toggle(s.name)}>
              <span className="nm">{s.name}</span><small className="pr">{money(s.price)}</small>
            </button>))}
          </div>
        </div>

        <div>
          <h3>Horários <span className="dev-legend">{duration > 30 ? '** Esse horário de 1h precisa de mais meia hora seguinte livre **' : ''}</span></h3>
          <div className="dev-chips dev-times">{slotsOfDay(date).map(t => {
            const taken = busy.includes(t)
            const ok = free.get(t)
            const state = taken ? ' busy' : !ok ? ' nofit' : passed(t) ? ' past' : ''
            const hint = taken ? 'Agendado' : !ok ? 'Não cabe' : passed(t) ? 'Já passou (livre)' : 'Livre'
            return (
              <button type="button" key={t} disabled={!ok} title={hint} className={'dev-chip' + state + (time === t ? ' on' : '')} onClick={() => setTime(t)}>
                <span className="hora">{t}</span>
                {taken && <small className="agendado">Agendado</small>}
              </button>)
          })}</div>
        </div>

        {msg && <p className={msg.ok ? 'dev-ok' : 'dev-err'}>
          {msg.ok ? <FaCheckCircle /> : <FaExclamationCircle />}
          {msg.text}</p>}

        <div className="dev-new-foot">
          <p className="dev-new-sum">
            {service.length > 0 && time
              ? <><FaCheckCircle /> {name.trim() && name.trim() + ' = '}{service.join(' + ')} · {money(total)} · {fmt(date)} às {joinTimes(slotsFor(time, duration))}</>
              : ''}
          </p>
          <button className="dev-btn sm" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</button>
        </div>
      </form>
    </section>)
}
