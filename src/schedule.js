// Grade de horários e duração dos serviços.
// Cada horário da agenda tem 30 minutos. Serviços mais longos ocupam mais de um horário.

const STEP = 30 // minutos por horário

// Serviços e preços (usados no site de agendamento e no painel do Alex)
export const SERVICES = [
  { name: 'Corte', price: 35 },
  { name: 'Barba', price: 25 },
  { name: 'Pezinho', price: 10 },
  { name: 'Sobrancelha', price: 10 },
  { name: 'Corte + Sobrancelha', price: 40 },
  { name: 'Corte + Barba + Sobrancelha', price: 60 },
]

// Grade de horários da barbearia (de 30 em 30 min, com pausa para o almoço)
export const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00']

// Horários de SÁBADO (diferentes da semana). Para incluir ou tirar um horário, edite esta lista.
export const SATURDAY_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00']

const isSaturday = date => Boolean(date) && new Date(date + 'T12:00').getDay() === 6
export const slotsOfDay = date => (isSaturday(date) ? SATURDAY_TIMES : TIMES)

// Horários que NÃO aparecem para o cliente escolher, mas que um serviço longo pode ocupar na continuação.
// Ex.: serviço de 1h às 19:00 ocupa 19:00 e 19:30, e o 19:30 não existe na grade.
// Fora desta lista, um horário que não está na grade (como o almoço, 12:00 e 12:30 em dias de semana) bloqueia o serviço.
const EXTRA = { week: ['19:30'], sat: ['12:30', '13:30'] }
export const extraSlotsOf = date => (isSaturday(date) ? EXTRA.sat : EXTRA.week)

// ['09:00', '09:30'] -> "09:00 e 09:30"
export const joinTimes = ts => (ts.length > 1 ? ts.slice(0, -1).join(', ') + ' e ' + ts[ts.length - 1] : ts[0])

// Combinações de serviços que demoram mais de 30 minutos.
// Vale tanto para o serviço combinado quanto para quem marca os três separados.
// Para incluir outra combinação, acrescente uma linha: { parts: ['Corte', 'Barba'], minutes: 60 }
const LONG_COMBOS = [
  { parts: ['Corte', 'Barba', 'Sobrancelha'], minutes: 60 },
]

// Aceita o nome ("Corte + Barba"), a lista (['Corte', 'Barba']) ou o texto já unido pelo site.
const partsOf = service =>
  new Set((Array.isArray(service) ? service : [service])
    .flatMap(n => String(n || '').split('+'))
    .map(p => p.trim())
    .filter(Boolean))

/** Duração em minutos do que o cliente escolheu. */
export function durationOf(service) {
  const parts = partsOf(service)
  const long = LONG_COMBOS.filter(c => c.parts.every(p => parts.has(p))).map(c => c.minutes)
  return Math.max(STEP, ...long)
}

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toTime = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/** Horários que o serviço ocupa. slotsFor('13:00', 60) -> ['13:00', '13:30'] */
export function slotsFor(start, duration = STEP) {
  const n = Math.max(1, Math.ceil(duration / STEP))
  return Array.from({ length: n }, (_, i) => toTime(toMin(start) + i * STEP))
}

/** Hora em que termina. endTime('13:00', 60) -> '14:00' */
export const endTime = (start, duration = STEP) => toTime(toMin(start) + duration)

/**
 * Horários que o cliente pode escolher para um serviço.
 *   daySlots: horários do dia (a grade que o site já usa, ex.: ['08:00', '08:30', ...])
 *   busy:     horários ocupados nesse dia (ex.: ['13:00', '13:30'])
 *   duration: durationOf(serviço escolhido)
 *   opts.hourlyOnly: serviço longo mostra só horários cheios (padrão). O painel passa false para
 *                     poder encaixar um atendimento de 1h em qualquer meia hora livre.
 *   opts.extra:      horários de continuação fora da grade (extraSlotsOf(data)), ex.: ['19:30'].
 *                     Sem isso, só vale o que está dentro da grade.
 * Retorna [{ time, free }]. Todos os horários seguintes que o serviço ocupa precisam estar livres.
 */
export function startOptions(daySlots, busy, duration = STEP, { hourlyOnly = duration > STEP, extra = [] } = {}) {
  const taken = new Set(busy)
  const grid = new Set(daySlots)
  const spare = new Set(extra)
  // horário da grade ou de continuação: precisa estar livre. Qualquer outro (ex.: almoço) bloqueia.
  const okSlot = s => (grid.has(s) || spare.has(s)) && !taken.has(s)
  return daySlots
    .filter(t => !hourlyOnly || t.endsWith(':00'))
    .map(t => ({ time: t, free: slotsFor(t, duration).every(okSlot) }))
}
