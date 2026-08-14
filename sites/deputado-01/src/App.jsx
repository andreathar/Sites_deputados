import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Hero from './sections/Hero.jsx'
import Sobre from './sections/Sobre.jsx'
import Propostas from './sections/Propostas.jsx'
import Newsletter from './sections/Newsletter.jsx'
import Obrigado from './pages/Obrigado.jsx'

// Scroll to top on route change (e.g. going to /obrigado)
function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Home() {
  return (
    <main>
      <Hero />
      <Sobre />
      <Propostas />
      <Newsletter />
    </main>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/obrigado" element={<Obrigado />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Footer />
    </>
  )
}
