import React from 'react'
import site from '../site-config.js'

export default function Sobre() {
  return (
    <section className="sobre section" id="sobre">
      <div className="container">
        <h2 className="section__title">Sobre</h2>
        <p className="section__lead">Quem é {site.name.split(' ')[0]}</p>
        <div className="sobre__body">
          <p>{site.bio}</p>
        </div>
      </div>
    </section>
  )
}
