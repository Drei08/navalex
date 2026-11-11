import { Fragment, useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

// Curva suave usada em quase todas as animações do site
export const EASE = [0.22, 1, 0.36, 1]

// Anima quando o elemento entra na tela, uma única vez
export const VIEW = { once: true, amount: 0.25 }

// ---------------------------------------------------------------- variantes
// Container que anima os filhos um depois do outro
export const stagger = (gap = 0.12, delay = 0) => ({
  hide: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

// Filho que chega de um lado (x) ou de baixo/cima (y)
export const fromSide = (x = 0, y = 0, duration = 0.7) => ({
  hide: { opacity: 0, x, y },
  show: { opacity: 1, x: 0, y: 0, transition: { duration, ease: EASE } },
})

const OFFSET = (d) => ({ left: { x: -d }, right: { x: d }, top: { y: -d }, bottom: { y: d }, none: {} })

// ------------------------------------------------------------------ Reveal
// <Reveal as="h2" from="left">...</Reveal>  -> aparece quando entra na tela
export function Reveal({ as = 'div', from = 'bottom', distance = 40, delay = 0, duration = 0.7, children, ...rest }) {
  const Tag = motion[as]
  return (
    <Tag
      initial={{ opacity: 0, ...OFFSET(distance)[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={VIEW}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// --------------------------------------------------------------- SplitText
// Texto que aparece letra por letra. `active` liga/desliga a animação
// (no slide, cada título anima quando o slide fica ativo).
const letter = {
  hide: { opacity: 0, y: '0.7em', transition: { duration: 0.25 } },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

export function SplitText({ text, as = 'span', active = true, stagger: gap = 0.035, delay = 0, ...rest }) {
  const Tag = motion[as]
  const parent = {
    hide: { transition: { staggerChildren: gap * 0.3, staggerDirection: -1 } },
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  }
  const words = text.split(' ')

  return (
    <Tag variants={parent} initial="hide" animate={active ? 'show' : 'hide'} aria-label={text} {...rest}>
      {words.map((word, w) => (
        <Fragment key={w}>
          <span className="split-word" aria-hidden="true">
            {[...word].map((ch, i) => (
              <motion.span key={i} className="split-ch" variants={letter}>
                {ch}
              </motion.span>
            ))}
          </span>
          {w < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  )
}

// ---------------------------------------------------------------- Carousel
// Carrossel que pula sozinho a cada `interval` ms.
// Pausa ao passar o mouse/focar, só roda quando está visível na tela, aceita arrastar (celular),
// setas do teclado, clique nas fotos laterais e nos pontinhos (que mostram o tempo até a próxima).
const POS = [0, 92, 168] // deslocamento (% da largura da foto) por distância do centro
const SCALE = [1, 0.86, 0.72]
const ALPHA = [1, 0.55, 0.22]

const offsetOf = (i, cur, n) => {
  let d = i - cur
  if (d > n / 2) d -= n
  if (d < -n / 2) d += n
  return d
}

export function Carousel({ images, alt = '', interval = 5000 }) {
  const n = images.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = useReducedMotion()
  const anterior = useRef({})
  // entrada: as fotos abrem em leque a partir do centro quando o carrossel aparece no scroll
  const entrou = useInView(ref, { once: true, amount: 0.3 })
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    if (!entrou) return undefined
    const t = setTimeout(() => setPronto(true), 1400)
    return () => clearTimeout(t)
  }, [entrou])

  const next = () => setIndex((v) => (v + 1) % n)
  const prev = () => setIndex((v) => (v - 1 + n) % n)

  const tocando = inView && !paused && !reduce && n > 1

  useEffect(() => {
    if (!tocando) return undefined
    const t = setTimeout(next, interval)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocando, index, interval, n])

  // guarda a posição de cada foto para saber quando uma "deu a volta" (e não animar o salto)
  const offsets = images.map((_, i) => offsetOf(i, index, n))
  const saltou = offsets.map((o, i) => anterior.current[i] !== undefined && Math.abs(anterior.current[i] - o) > n / 2)
  useEffect(() => {
    anterior.current = Object.fromEntries(offsets.map((o, i) => [i, o]))
  })

  function aoTeclar(e) {
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') prev()
  }

  return (
    <div
      ref={ref}
      className="carousel"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Fotos dos trabalhos"
      tabIndex={0}
      onKeyDown={aoTeclar}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <motion.div
        className="car-stage"
        style={{ touchAction: 'pan-y' }}
        onPanEnd={(_, info) => {
          if (info.offset.x < -50) next()
          else if (info.offset.x > 50) prev()
        }}
      >
        {images.map((src, i) => {
          const off = offsets[i]
          const abs = Math.min(Math.abs(off), 2)
          const dir = off < 0 ? -1 : 1
          const spring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }
          return (
            <motion.div
              key={src}
              className={'car-item' + (off === 0 ? ' on' : '')}
              style={{ zIndex: 4 - abs, pointerEvents: Math.abs(off) > 2 ? 'none' : 'auto' }}
              initial={{ x: '0%', y: 60, scale: 0.5, opacity: 0 }}
              animate={
                entrou
                  ? { x: `${dir * POS[abs]}%`, y: 0, scale: SCALE[abs], opacity: Math.abs(off) > 2 ? 0 : ALPHA[abs] }
                  : { x: '0%', y: 60, scale: 0.5, opacity: 0 }
              }
              transition={
                !pronto
                  ? { type: 'spring', stiffness: 110, damping: 18, delay: abs * 0.15 + (off === 0 ? 0 : 0.2) }
                  : saltou[i]
                  ? { x: { duration: 0 }, scale: { duration: 0 }, opacity: { duration: 0.4 } }
                  : { x: spring, scale: spring, opacity: { duration: 0.3 } }
              }
              onClick={() => off !== 0 && setIndex(i)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${n}`}
              aria-hidden={off !== 0}
            >
              <img src={src} alt={alt} draggable={false} loading="lazy" />
            </motion.div>
          )
        })}

        <button type="button" className="arrow l" aria-label="Foto anterior" onClick={prev}>
          <FaChevronLeft />
        </button>
        <button type="button" className="arrow r" aria-label="Próxima foto" onClick={next}>
          <FaChevronRight />
        </button>
      </motion.div>

      <div className="car-dots">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            className={'car-dot' + (i === index ? ' on' : '')}
            aria-label={`Ir para a foto ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          >
            {i === index && (
              <motion.i
                key={`${index}-${tocando}`}
                initial={{ scaleX: tocando ? 0 : 1 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: tocando ? interval / 1000 : 0, ease: 'linear' }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
