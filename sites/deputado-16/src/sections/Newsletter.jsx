import React from 'react'
import { useNavigate } from 'react-router-dom'
import site from '../site-config.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Newsletter() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [name, setName] = React.useState('')
  const [status, setStatus] = React.useState('idle') // idle | sending | error
  const [error, setError] = React.useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error')
      setError('Informe um e-mail válido.')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, name: name.trim(), slug: site.slug })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Não foi possível concluir. Tente novamente.')
      }
      // Redirect to the thank-you page, passing the e-mail for confirmation
      navigate(`/obrigado?email=${encodeURIComponent(trimmed)}`)
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Não foi possível concluir. Tente novamente.')
    }
  }

  return (
    <section className="newsletter section" id="newsletter">
      <div className="container">
        <div className="newsletter__card">
          <h2 className="section__title">Receba as novidades</h2>
          <p className="section__lead">
            Cadastre-se para receber convites para eventos e as novidades de {site.name.split(' ')[0]} direto no seu e-mail.
          </p>

          <form className="newsletter__form" onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              placeholder="Seu nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="newsletter__input"
              autoComplete="name"
            />
            <input
              type="email"
              placeholder="Seu melhor e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="newsletter__input"
              autoComplete="email"
              required
            />
            <button
              type="submit"
              className="btn btn--primary newsletter__submit"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Enviando…' : 'Quero receber novidades'}
            </button>
          </form>

          {status === 'error' && <p className="newsletter__error" role="alert">{error}</p>}
          <p className="newsletter__hint">
            Ao se cadastrar você concorda em receber e-mails de {site.name}. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  )
}
