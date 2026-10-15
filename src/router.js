// Roteador mínimo por caminho (/sobre, /agendar, /admin), sem biblioteca e sem "#".
import { useEffect, useState } from 'react'

export const currentPath = () => location.pathname.replace(/\/+$/, '') || '/'

/** Vai para outro caminho sem recarregar a página. */
export function navigate(path) {
  if (path !== currentPath()) history.pushState(null, '', path)
  dispatchEvent(new Event('navigate')) // também avisa quando clica na mesma seção, para rolar de novo
}

/** Uso em links: <a href="/sobre" onClick={e => go(e, '/sobre')}>. Ctrl+clique abre em nova aba normalmente. */
export function go(e, path) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  navigate(path)
}

/** Caminho atual; atualiza ao navegar e no botão voltar/avançar do navegador. */
export function usePath() {
  const [state, setState] = useState({ path: currentPath(), tick: 0 })
  useEffect(() => {
    const update = () => setState(s => ({ path: currentPath(), tick: s.tick + 1 }))
    addEventListener('popstate', update)
    addEventListener('navigate', update)
    return () => { removeEventListener('popstate', update); removeEventListener('navigate', update) }
  }, [])
  return state
}
