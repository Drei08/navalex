// Agendamentos no Firebase (Firestore) + login do painel (Authentication).
// Sem as variáveis VITE_FIREBASE_* no .env, o site público usa o localStorage (modo de teste).
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, getDocs, query, where, orderBy, runTransaction, onSnapshot, deleteDoc } from 'firebase/firestore'
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

// modo de teste: avisa quem está "ouvindo" quando algo muda
const listeners = new Set()
const emit = () => listeners.forEach(fn => fn(upcoming()))

export async function listBookings() {
  if (!isRemote) return upcoming()
  const snap = await getDocs(query(collection(db, 'agendamentos'), where('date', '>=', today()), orderBy('date')))
  return snap.docs.map(d => d.data()).sort(byDate)
}

// Tempo real: chama cb(lista) sempre que um agendamento é criado ou excluído. Retorna a função para parar de ouvir.
export function subscribeBookings(cb) {
  if (!isRemote) { listeners.add(cb); cb(upcoming()); return () => listeners.delete(cb) }
  const q = query(collection(db, 'agendamentos'), where('date', '>=', today()), orderBy('date'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data()).sort(byDate)), () => {})
}

export async function addBooking(b) {
  if (!isRemote) {
    const all = readLocal()
    if (all.some(x => x.date === b.date && x.time === b.time)) throw new Error('taken')
    localStorage.setItem(LS, JSON.stringify([...all, b]))
    emit()
    return
  }
  // o id do documento é "data_hora": dois clientes não conseguem ocupar o mesmo horário
  const ref = doc(db, 'agendamentos', docId(b))
  await runTransaction(db, async tx => {
    if ((await tx.get(ref)).exists()) throw new Error('taken')
    tx.set(ref, { name: b.name, date: b.date, time: b.time, service: b.service || '', price: Number(b.price) || 0 })
  })
}

// Só funciona logado com o e-mail autorizado nas regras do Firestore
export const deleteBooking = b => deleteDoc(doc(db, 'agendamentos', docId(b)))

export function watchUser(cb) {
  if (!auth) { cb(null); return () => {} }
  return onAuthStateChanged(auth, cb)
}
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const logout = () => signOut(auth)
