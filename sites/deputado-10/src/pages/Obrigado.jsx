import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import site from '../site-config.js'

export default function Obrigado() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''

  return (
    <section className="obrigado section" id="obrigado">
      <div className="container">
        <div className="obrigado__card">
          <div className="obrigado__check" aria-hidden="true">✓</div>
          <h1 className="obrigado__title">Inscrição confirmada!</h1>
          <p className="obrigado__text">
            Obrigado por se juntar a nós, <strong>{site.name.split(' ')[0] || 'candidato'}</strong>!
          </p>
          {email && (
            <p className="obrigado__email">
              Enviaremos novidades e convites para <strong>{email}</strong>.
            </p>
          )}
          <p className="obrigado__text">
            Fique de olho na sua caixa de entrada — novidades em breve.
          </p>
          <div className="obrigado__actions">
            <Link to="/" className="btn btn--primary">Voltar ao início</Link>
            {site.social.whatsapp && (
              <a
                className="btn btn--ghost"
                href={`https://wa.me/${site.social.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                Chamar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
