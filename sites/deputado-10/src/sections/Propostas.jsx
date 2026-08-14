import React from 'react'
import site from '../site-config.js'

export default function Propostas() {
  const proposals = site.proposals && site.proposals.length ? site.proposals : []

  return (
    <section className="propostas section" id="propostas">
      <div className="container">
        <h2 className="section__title">Propostas</h2>
        <p className="section__lead">As ideias que {site.name.split(' ')[0] || 'o candidato'} quer colocar em prática</p>

        {proposals.length > 0 ? (
          <div className="propostas__grid">
            {proposals.map((p, i) => (
              <article className="proposta card" key={i}>
                <div className="proposta__icon" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="proposta__title">{p.titulo}</h3>
                <p className="proposta__desc">{p.descricao}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="propostas__empty card">
            <p>
              As propostas de {site.name} serão publicadas em breve.
              <br />
              Cadastre-se abaixo para ser o primeiro a saber.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
