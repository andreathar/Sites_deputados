import React from 'react'
import { Link } from 'react-router-dom'
import site from '../site-config.js'

export default function Navbar() {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__brand" onClick={() => setOpen(false)}>
          {site.media.logo ? (
            <img src={site.media.logo} alt={`Logo de ${site.name}`} className="navbar__logo" />
          ) : (
            <span className="navbar__brand-text">{site.name}</span>
          )}
        </Link>

        <button
          className="navbar__toggle"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`navbar__links ${open ? 'is-open' : ''}`}>
          <a href="#sobre" onClick={() => setOpen(false)}>Sobre</a>
          <a href="#propostas" onClick={() => setOpen(false)}>Propostas</a>
          <a href="#newsletter" onClick={() => setOpen(false)}>Novidades</a>
          <a href="#newsletter" className="btn btn--small btn--primary" onClick={() => setOpen(false)}>
            Participe
          </a>
        </nav>
      </div>
    </header>
  )
}
