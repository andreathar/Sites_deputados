import React from 'react'
import site from '../site-config.js'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__brand">{site.name}</p>
        <p className="footer__text">
          © {year} {site.name}. Feito com <span aria-hidden="true">💙</span> para transformar ideias em ação.
        </p>
        {site.social.instagram && (
          <div className="footer__social">
            <a href={`https://instagram.com/${site.social.instagram}`} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </div>
        )}
      </div>
    </footer>
  )
}
