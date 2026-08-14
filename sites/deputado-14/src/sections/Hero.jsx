import React from 'react'
import site from '../site-config.js'

export default function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero__overlay" />
      <div className="hero__inner container">
        <div className="hero__media">
          {site.media.foto ? (
            <img src={site.media.foto} alt={`Foto de ${site.name}`} className="hero__foto" />
          ) : (
            <div className="hero__foto hero__foto--placeholder">
              <span>{site.name}</span>
            </div>
          )}
        </div>

        <div className="hero__content">
          {site.media.logo && (
            <img src={site.media.logo} alt={`Logo de ${site.name}`} className="hero__logo" />
          )}
          <p className="hero__eyebrow">{site.role || 'Candidatura'}</p>
          <h1 className="hero__title">{site.name}</h1>
          {site.number && <p className="hero__number">{site.number}</p>}
          <p className="hero__tagline">{site.tagline}</p>
          <div className="hero__actions">
            <a href="#propostas" className="btn btn--primary">Conheça as propostas</a>
            <a href="#newsletter" className="btn btn--ghost">Receber novidades</a>
          </div>
          {site.media.jingle && (
            <div className="hero__jingle">
              <audio controls preload="none">
                <source src={site.media.jingle} type="audio/mpeg" />
                Seu navegador não suporta o player de áudio.
              </audio>
            </div>
          )}
          {site.social.whatsapp && (
            <a
              className="hero__whatsapp"
              href={`https://wa.me/${site.social.whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              Fale com {site.name.split(' ')[0] || 'a gente'}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
