// Agendamentos no Firebase (Firestore) + login do painel (Authentication).
// Sem as variáveis VITE_FIREBASE_* no .env, o site público usa o localStorage (modo de teste).
//
// Duas coleções no Firestore:
//   horarios      -> { date, time, name } com só o PRIMEIRO nome. É pública: o site lê para mostrar os horários ocupados.
//   agendamentos  -> { name, date, time, service, price }. É privada: só o dono lê (ver firestore.rules).
// As duas usam o mesmo id "data_hora" e são gravadas/apagadas juntas, sempre em uma operação só.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, getDocs, query, where, orderBy, runTransaction, writeBatch, onSnapshot } from 'firebase/firestore'
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
const upcoming = () => readLocal().filter(b => b.date >= today()).sort(byDate)
const docId = b => `${b.date}_${b.time}`

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
export function subscribeAllBookings(cb) {
  if (!isRemote) { listeners.add(cb); cb(readLocal().sort(byDate)); return () => listeners.delete(cb) }
  return onSnapshot(
    collection(db, 'agendamentos'),
    snap => cb(snap.docs.map(d => d.data()).sort(byDate)),
    err => console.error('Firestore (agendamentos):', err.code, err.message)
  )
}

export async function addBooking(b) {
  if (!isRemote) {
    const all = readLocal()
    if (all.some(x => x.date === b.date && x.time === b.time)) throw new Error('taken')
    localStorage.setItem(LS, JSON.stringify([...all, b]))
    emit()
    return
  }
  // O id do documento é "data_hora": dois clientes não conseguem ocupar o mesmo horário.
  // A checagem é feita na coleção pública "horarios", que o site tem permissão de ler.
  const id = docId(b)
  const slotRef = doc(db, 'horarios', id)
  const bookingRef = doc(db, 'agendamentos', id)
  await runTransaction(db, async tx => {
    if ((await tx.get(slotRef)).exists()) throw new Error('taken')
    tx.set(slotRef, { date: b.date, time: b.time, name: publicName(b.name) })
    tx.set(bookingRef, { name: b.name, date: b.date, time: b.time, service: b.service || '', price: Number(b.price) || 0 })
  })
}

// Só funciona logado com o e-mail autorizado nas regras do Firestore.
// Apaga o agendamento e o horário juntos, para o horário voltar a ficar livre no site.
export function deleteBooking(b) {
  const id = docId(b)
  const batch = writeBatch(db)
  batch.delete(doc(db, 'agendamentos', id))
  batch.delete(doc(db, 'horarios', id))
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
