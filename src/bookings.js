// Agendamentos no Firebase (Firestore) + login do painel (Authentication).
// Sem as variáveis VITE_FIREBASE_* no .env, o site público usa o localStorage (modo de teste).
//
// Duas coleções no Firestore:
//   horarios      -> { date, time, name } com só o PRIMEIRO nome. É pública: o site lê para mostrar os horários ocupados.
//   agendamentos  -> { name, date, time, service, price }. É privada: só o dono lê (ver firestore.rules).
// As duas usam o id "data_hora" e são gravadas/apagadas juntas, sempre em uma operação só.
// Serviço de mais de 30 min (ex.: 1h) grava UM agendamento e um "horario" para cada 30 min ocupados;
// os horários de continuação levam o campo ref = id do horário inicial.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, getDocs, query, where, orderBy, runTransaction, writeBatch, onSnapshot } from 'firebase/firestore'
import { durationOf, slotsFor } from './schedule.js'
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const isRemote = Boolean(cfg.apiKey && cfg.projectId)
const app = isRemote ? initializeApp(cfg) : null
const db = app ? getFirestore(app) : null
const auth = app ? getAuth(app) : null
const LS = 'alex-agendamentos'

const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) }
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]') } catch { return [] } }
const byDate = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
const docId = b => `${b.date}_${b.time}`
// modo de teste: cada agendamento vira um horário ocupado para cada 30 min que ele dura
const expand = b => slotsFor(b.time, b.duration || 30).map((t, i) =>
  ({ date: b.date, time: t, name: b.name, ...(i ? { ref: docId(b) } : {}) }))
const upcoming = () => readLocal().filter(b => b.date >= today()).flatMap(expand).sort(byDate)

// Nome que aparece na lista pública de horários. Só o primeiro nome, para não expor o nome completo.
// Para mostrar o nome completo, troque o corpo por: String(n || '').trim().slice(0, 30) || 'Cliente'
const publicName = n => String(n || '').trim().split(/\s+/)[0].slice(0, 30) || 'Cliente'

// modo de teste: avisa quem está "ouvindo" quando algo muda
const listeners = new Set()
const emit = () => listeners.forEach(fn => fn(upcoming()))

// Horários ocupados de hoje em diante (só data e hora, sem dados do cliente)
const upcomingSlots = () => query(collection(db, 'horarios'), where('date', '>=', today()), orderBy('date'))

export async function listBookings() {
  if (!isRemote) return upcoming()
  const snap = await getDocs(upcomingSlots())
  return snap.docs.map(d => d.data()).sort(byDate)
}

// Site de agendamento: só de hoje em diante
export function subscribeBookings(cb) {
  if (!isRemote) { listeners.add(cb); cb(upcoming()); return () => listeners.delete(cb) }
  return onSnapshot(upcomingSlots(), snap => cb(snap.docs.map(d => d.data()).sort(byDate)), () => {})
}

// Painel do Alex: todos, inclusive dias que já passaram (só o dono logado consegue ler)
// onError (opcional) recebe o erro de leitura, para o painel avisar em vez de mostrar uma lista vazia sem explicação
export function subscribeAllBookings(cb, onError) {
  if (!isRemote) { listeners.add(cb); cb(readLocal().sort(byDate)); return () => listeners.delete(cb) }
  return onSnapshot(
    collection(db, 'agendamentos'),
    snap => cb(snap.docs.map(d => d.data()).sort(byDate)),
    err => { console.error('Firestore (agendamentos):', err.code, err.message); onError?.(err) }
  )
}

export async function addBooking(b) {
  if (!isRemote) {
    const all = readLocal()
    const duration = durationOf(b.service)
    const busy = new Set(all.filter(x => x.date === b.date).flatMap(x => slotsFor(x.time, x.duration || 30)))
    if (slotsFor(b.time, duration).some(t => busy.has(t))) throw new Error('taken')
    localStorage.setItem(LS, JSON.stringify([...all, { ...b, duration }]))
    emit()
    return
  }
  // O id do documento é "data_hora": dois clientes não conseguem ocupar o mesmo horário.
  // A checagem é feita na coleção pública "horarios", que o site tem permissão de ler.
  // Serviço de 1h ocupa dois horários (ex.: 13:00 e 13:30); só agenda se TODOS estiverem livres.
  const id = docId(b)
  const duration = durationOf(b.service)
  const times = slotsFor(b.time, duration)
  const slotRefs = times.map(t => doc(db, 'horarios', `${b.date}_${t}`))
  const bookingRef = doc(db, 'agendamentos', id)
  try {
    await runTransaction(db, async tx => {
      const snaps = await Promise.all(slotRefs.map(r => tx.get(r)))
      if (snaps.some(s => s.exists())) throw new Error('taken')
      slotRefs.forEach((r, i) => {
        const slot = { date: b.date, time: times[i], name: publicName(b.name) }
        tx.set(r, i === 0 ? slot : { ...slot, ref: id })
      })
      // "duration" só é gravado nos serviços longos: os de 30 min continuam idênticos aos de antes
      // (funcionam mesmo se as regras do Firestore ainda forem as antigas).
      tx.set(bookingRef, {
        name: b.name, date: b.date, time: b.time, service: b.service || '', price: Number(b.price) || 0,
        ...(duration > 30 ? { duration } : {}),
      })
    })
  } catch (e) {
    // Horário ocupado é esperado; qualquer outro erro (ex.: permission-denied) aparece no Console (F12)
    if (e.message !== 'taken') console.error('Falha ao agendar:', e.code, e.message)
    throw e
  }
}

// Só funciona logado com o e-mail autorizado nas regras do Firestore.
// Apaga o agendamento e todos os horários que ele ocupava, para voltarem a ficar livres no site.
export function deleteBooking(b) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'agendamentos', docId(b)))
  slotsFor(b.time, b.duration || 30).forEach(t => batch.delete(doc(db, 'horarios', `${b.date}_${t}`)))
  return batch.commit()
}

// RODAR UMA VEZ, logado como dono: cria/atualiza os "horarios" a partir dos agendamentos que já existem
// (inclui o primeiro nome). Sem isso, os horários antigos aparecem livres ou sem nome no site.
// (Lotes de 10: as regras consultam outro documento a cada gravação e há limite por lote.)
export async function migrateHorarios() {
  const docs = (await getDocs(collection(db, 'agendamentos'))).docs
  for (let i = 0; i < docs.length; i += 10) {
    const batch = writeBatch(db)
    docs.slice(i, i + 10).forEach(d => {
      const { date, time, name } = d.data()
      batch.set(doc(db, 'horarios', d.id), { date, time, name: publicName(name) })
    })
    await batch.commit()
  }
  return docs.length
}

export function watchUser(cb) {
  if (!auth) { cb(null); return () => {} }
  return onAuthStateChanged(auth, cb)
}
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const logout = () => signOut(auth)
