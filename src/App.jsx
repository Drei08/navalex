import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { FaWhatsapp, FaInstagram, FaMapMarkerAlt, FaCut, FaCalendarCheck,
  FaChevronLeft, FaChevronRight, FaBars, FaTimes, FaUser } from 'react-icons/fa'
import { PHONE, WA, INSTAGRAM, ADDRESS, ENDER, MAPS } from './config.js'
import { EASE, VIEW, Reveal, SplitText, Carousel, stagger, fromSide } from './anim.jsx'
import Booking from './Booking.jsx'
import Admin from './Admin.jsx'

const slides = [
  { img: 'foto1.jpg', title: 'Degradê na régua', text: 'Acabamento limpo, do início ao fim.' },
  { img: 'foto3.jpg', title: 'Detalhe na tesoura', text: 'Atendimento com calma e cuidado.' },
]
const gallery = ['foto24.png', 'foto6.png', 'foto21.png', 'foto18.png', 'foto4.jpg', 'foto17.png', 'foto23.png', 'foto11.png',
  'foto13.png', 'foto10.png'
]

const contatos = [
  { Icon: FaWhatsapp, titulo: 'WhatsApp', texto: PHONE, href: WA, externo: true },
  { Icon: FaCalendarCheck, titulo: 'Agendar', texto: ENDER, href: '#/agendar' },
  { Icon: FaInstagram, titulo: 'Instagram', texto: '@navalhex', href: INSTAGRAM, externo: true },
]

// variantes usadas pelas seções (definidas fora para não recriar a cada render)
const aboutCard = stagger(0.15)
const aboutImg = {
  hide: { opacity: 0, x: -70, scale: 1.06 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
}
const aboutTxt = stagger(0.14, 0.25)
const doLado = fromSide(90) // texto do Sobre chega da direita

const doEsquerda = fromSide(-90) // texto do Convite chega da esquerda
const aboutVideo = {
  hide: { opacity: 0, x: 70, scale: 1.04 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
}

const cardsGrid = stagger(0.15)
const cardItem = {
  hide: { opacity: 0, y: 50, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 16 } },
}
const cardIcone = {
  hide: { scale: 0, rotate: -40 },
  show: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 14, delay: 0.15 } },
}
const mapWrap = { hide: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delayChildren: 0.15 } } }
const mapBox = {
  hide: { scale: 0.94, clipPath: 'inset(0% 0% 100% 0% round 16px)' },
  show: { scale: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)', transition: { duration: 0.9, ease: EASE } },
}
const cardTexto = fromSide(-45) // texto dos cartões chega da esquerda

function Hero() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % slides.length), 5000); return () => clearInterval(t) }, [])
  return (
    <header className="hero" id="inicio">
      {slides.map((s, k) => {
        const ativo = k === i
        return (
          <div key={k} className={'slide' + (ativo ? ' on' : '')} style={{ backgroundImage: `url(img/${s.img})` }}>
            <div className="shade" />
            <div className="slide-txt">
              <SplitText as="h1" text={s.title} active={ativo} delay={0.2} />
              <motion.span
                className="slide-line"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: ativo ? 1 : 0 }}
                transition={{ duration: 0.7, delay: ativo ? 0.6 : 0, ease: EASE }}
              />
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={ativo ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.7, delay: ativo ? 0.8 : 0, ease: EASE }}
              >
                {s.text}
              </motion.p>
            </div>
          </div>)
      })}
      <button className="arrow l" aria-label="Anterior" onClick={() => setI((i + slides.length - 1) % slides.length)}><FaChevronLeft /></button>
      <button className="arrow r" aria-label="Próximo" onClick={() => setI((i + 1) % slides.length)}><FaChevronRight /></button>
      <div className="dots">{slides.map((_, k) => <button key={k} aria-label={'Slide ' + (k + 1)} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
    </header>)
}

function Home() {
  const [open, setOpen] = useState(false)
  const links = [['sobre', 'SOBRE'], ['trabalhos', 'TRABALHOS'], ['contatos', 'CONTATOS'], ['localizacao', 'LOCALIZAÇÃO']]

  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        className="nav"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <a className="logo" href="#inicio" aria-label="Barbeiro Navalex">
          <motion.span
            className="logo-ico"
            initial={{ rotate: -70, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            whileHover={{ rotate: [0, -25, 10, 0], transition: { duration: 0.5 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
          >
            <FaCut />
          </motion.span>
          <SplitText text="Barbeiro Navalex" delay={0.5} stagger={0.04} />
        </a>
        <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <FaTimes /> : <FaBars />}</button>
        <ul className={open ? 'open' : ''}>
          {links.map(([id, t], k) => (
            <motion.li
              key={id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + k * 0.09, ease: EASE }}
            >
              <a href={'#' + id} onClick={() => setOpen(false)}>{t}</a>
            </motion.li>
          ))}
          <motion.li
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 + links.length * 0.09, ease: EASE }}
          >
            <a className="nav-login" href="/admin"><FaUser /> LOGIN</a>
          </motion.li>
        </ul>
      </motion.nav>

      <Hero />

      <section id="sobre" className="sec">
        <Reveal as="h2">Sobre</Reveal>
        <motion.div className="about-card" variants={aboutCard} initial="hide" whileInView="show" viewport={VIEW}>
          <motion.img className="about-img" variants={aboutImg} src="img/sobre.png" alt="Alex Navalex na barbearia" loading="lazy" />
          <motion.div className="about-txt" variants={aboutTxt}>
            <motion.h3 variants={doLado}>Alex Navalex</motion.h3>
            <motion.p variants={doLado}>Aqui o corte é feito com atenção a cada detalhe: degradê, tesoura, máquina e acabamento na navalha.</motion.p>
            <motion.p variants={doLado}>O atendimento é no ritmo de cada cliente, sem pressa, para você sair com o visual que queria. Venha conhecer o trabalho do Alex Navalex em Osvaldo Cruz.</motion.p>
          </motion.div>
        </motion.div>
      </section>

      <section id="trabalhos" className="sec tab">
        <Reveal as="h2">Nossos Trabalhos</Reveal>
        <Carousel images={gallery.map(g => 'img/' + g)} alt="Corte feito por Alex Navalex" interval={3000} />
      </section>

      <section id="contato" className="sec">
        <Reveal as="h2">Contato</Reveal>
        <motion.div className="cards" variants={cardsGrid} initial="hide" whileInView="show" viewport={VIEW}>
          {contatos.map(({ Icon, titulo, texto, href, externo }) => (
            <motion.a
              key={titulo}
              className="card"
              href={href}
              variants={cardItem}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <motion.div className="card-ico" variants={cardIcone}><Icon /></motion.div>
              <motion.b variants={cardTexto}>{titulo}</motion.b>
              <motion.span variants={cardTexto}>{texto}</motion.span>
            </motion.a>
          ))}
        </motion.div>
      </section>

      <section id="convite" className="sec">
        <Reveal as="h2">Convite Navalex</Reveal>
        <motion.div className="about-card" variants={aboutCard} initial="hide" whileInView="show" viewport={VIEW}>
          <motion.div className="about-txt" variants={aboutTxt}>
            <motion.h3 variants={doEsquerda}>Convite especial</motion.h3>
            <motion.p variants={doEsquerda}>Você é nosso convidado! Venha conhecer o espaço do Alex Navalex e sair daqui com o corte que você merece.</motion.p>
            <motion.p variants={doEsquerda}>Reserve o seu horário e seja recebido com calma, atenção e acabamento caprichado, do degradê à navalha.</motion.p>
          </motion.div>
          <motion.video
            className="about-img convite-video"
            variants={aboutVideo}
            src="video/convite.mp4"
            poster="img/convite.jpg"
            controls
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Convite do Alex Navalex"
          />
        </motion.div>
      </section>

      <section id="localizacao" className="sec">
        <Reveal as="h2">Localização</Reveal>
        <Reveal as="p" className="addr" from="left" delay={0.1}>
          <motion.span
            className="pin"
            initial={{ y: -24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={VIEW}
            transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.5 }}
          >
            <FaMapMarkerAlt />
          </motion.span>{' '}
          {ADDRESS}
        </Reveal>
        {/* o observador fica no wrapper: um elemento 100% cortado por clip-path nunca "entra na tela" */}
        <motion.div variants={mapWrap} initial="hide" whileInView="show" viewport={VIEW}>
          <motion.div
            className="map"
            variants={mapBox}
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, height: 220 }}
            whileHover={{ scale: 1.015 }}
          >
            {/* o iframe é maior e sobe 170px para esconder o cartão de erro do Google no topo */}
            <iframe title="Mapa" src={MAPS} loading="lazy" style={{ height: 590, marginTop: -170 }} />
            <a
              className="map-link"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, display: 'block', cursor: 'pointer' }}
              href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ADDRESS)}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir localização no Google Maps"
            />
          </motion.div>
        </motion.div>
      </section>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
      >
        © {new Date().getFullYear()} <span className="dev-logo">dev<b>A<i className="flip">L</i>A</b></span> · Todos os Direitos Reservados
      </motion.footer>

      <motion.a
        className="fab"
        href="#/agendar"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 1.4 }}
      >
        <FaCalendarCheck /><span>Agendar um horário</span>
      </motion.a>
    </MotionConfig>)
}

const isAdmin = () => location.pathname.replace(/\/+$/, '').endsWith('/admin')

export default function App() {
  const [route, setRoute] = useState(location.hash)
  useEffect(() => { const f = () => { setRoute(location.hash); if (location.hash.startsWith('#/')) scrollTo(0, 0) }
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  if (isAdmin()) return <Admin />
  return route === '#/agendar' ? <Booking /> : <Home />
}
