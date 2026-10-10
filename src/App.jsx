import { useEffect, useRef, useState } from 'react'
import { FaWhatsapp, FaInstagram, FaMapMarkerAlt, FaCut, FaPhoneAlt, FaCalendarCheck,
  FaChevronLeft, FaChevronRight, FaBars, FaTimes, FaRegClock } from 'react-icons/fa'
import { PHONE, WA, INSTAGRAM, ADDRESS, ENDER, MAPS } from './config.js'
import Booking from './Booking.jsx'
import Admin from './Admin.jsx'

const slides = [
  { img: 'foto1.jpg', title: 'Degradê na régua', text: 'Acabamento limpo, do início ao fim.' },
  { img: 'foto3.jpg', title: 'Detalhe na tesoura', text: 'Atendimento com calma e cuidado.' },
]
const gallery = ['foto6.png','foto2.jpg', 'foto8.png','foto1.jpg', 'foto3.jpg', 'foto4.jpg', , 'foto7.png']

function Hero() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % slides.length), 5000); return () => clearInterval(t) }, [])
  return (
    <header className="hero" id="inicio">
      {slides.map((s, k) => (
        <div key={k} className={'slide' + (k === i ? ' on' : '')} style={{ backgroundImage: `url(img/${s.img})` }}>
          <div className="shade" />
          <div className="slide-txt">
            <h1>{s.title}</h1>
            <p>{s.text}</p>
          </div>
        </div>))}
      <button className="arrow l" aria-label="Anterior" onClick={() => setI((i + slides.length - 1) % slides.length)}><FaChevronLeft /></button>
      <button className="arrow r" aria-label="Próximo" onClick={() => setI((i + 1) % slides.length)}><FaChevronRight /></button>
      <div className="dots">{slides.map((_, k) => <button key={k} aria-label={'Slide ' + (k + 1)} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
    </header>)
}

function Gallery() {
  const ref = useRef()
  const go = d => ref.current.scrollBy({ left: d * 300, behavior: 'smooth' })
  return (
    <section id="trabalhos" className="sec tab"><h2>Nossos Trabalhos</h2>
      <div className="car">
        <button className="arrow l" aria-label="Anterior" onClick={() => go(-1)}><FaChevronLeft /></button>
        <div className="track" ref={ref}>{gallery.map(g => <img key={g} src={'img/' + g} alt="Corte feito por Alex Navalex" loading="lazy" />)}</div>
        <button className="arrow r" aria-label="Próximo" onClick={() => go(1)}><FaChevronRight /></button>
      </div></section>)
}

function Home() {
  const [open, setOpen] = useState(false)
  const links = [['sobre', 'SOBRE'], ['trabalhos', 'TRABALHOS'], ['contato', 'CONTATO'], ['localizacao', 'LOCALIZAÇÃO']]
  
  return (<>
    <nav className="nav"><a className="logo" href="#inicio"><FaCut /> Cabelereiro Navalex</a>
      <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <FaTimes /> : <FaBars />}</button>
      <ul className={open ? 'open' : ''}>{links.map(([id, t]) => <li key={id}><a href={'#' + id} onClick={() => setOpen(false)}>{t}</a></li>)}
        </ul></nav>
    <Hero />
    <section id="sobre" className="sec">
      <h2>Sobre</h2>
      <div className="about-card">
        <img className="about-img" src="img/sobre.png" alt="Alex Navalex na barbearia" loading="lazy" />
        <div className="about-txt">
          <h3>Alex Navalex</h3>
          <p>Aqui o corte é feito com atenção a cada detalhe: degradê, tesoura, máquina e acabamento na navalha.</p>
          <p>O atendimento é no ritmo de cada cliente, sem pressa, para você sair com o visual que queria. Venha conhecer o trabalho do Alex Navalex em Osvaldo Cruz.</p>
        </div>
      </div>
    </section>
    <Gallery />
    <section id="contato" className="sec"><h2>Contato</h2>
      <div className="cards">
        <a className="card" href={WA} target="_blank" rel="noreferrer"><FaWhatsapp /><b>WhatsApp</b><span>{PHONE}</span></a>
        <a className="card" href="#/agendar"><FaCalendarCheck /><b>Agendar</b><span>{ENDER}</span></a>
        <a className="card" href={INSTAGRAM} target="_blank" rel="noreferrer"><FaInstagram /><b>Instagram</b><span>@navalhex</span></a>
      </div></section>
    <section id="localizacao" className="sec"><h2>Localização</h2>
          <p className="addr"><FaMapMarkerAlt /> {ADDRESS}</p>
          <div className="map" style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, height: 220 }}>
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
          </div>
        </section>

    <footer>© {new Date().getFullYear()} <span className="dev-logo">dev<b>A<i className="flip">L</i>A</b></span> · Todos os Direitos Reservados</footer>
    <a className="fab" href="#/agendar"><FaCalendarCheck /><span>Agendar um horário</span></a>
  </>)
}

const isAdmin = () => location.pathname.replace(/\/+$/, '').endsWith('/admin')

export default function App() {
  const [route, setRoute] = useState(location.hash)
  useEffect(() => { const f = () => { setRoute(location.hash); if (location.hash.startsWith('#/')) scrollTo(0, 0) }
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  if (isAdmin()) return <Admin />
  return route === '#/agendar' ? <Booking /> : <Home />
}
