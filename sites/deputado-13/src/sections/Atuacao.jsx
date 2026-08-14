import React from 'react'
import atuacao from '../data/atuacao.js'

// Renderiza o mapa das Regioes Administrativas do DF em SVG puro, a partir de
// /df-ras.geojson (colocado em public/). Sem lib de mapa: leve e responsivo.
//
// - Destaca as RAs listadas em atuacao.areasAtuacao
// - Plota os pins (lat/lng) por cima, na mesma projecao
// - Se o GeoJSON ainda nao existir, mostra um placeholder amigavel
//
// Projecao: equiretangular simples (lon->x, lat->y) com a latitude corrigida
// pelo cosseno da latitude central. Suficiente para a escala do DF.

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Extrai o nome da RA de um feature, tentando as chaves mais comuns.
function featureName(props) {
  if (!props) return ''
  const keys = ['name', 'NOME', 'nome', 'ra_nome', 'RA_NOME', 'NM_RA', 'Name', 'regiao']
  for (const k of keys) {
    if (props[k]) return props[k]
  }
  return ''
}

// Coleta todos os aneis de coordenadas de um feature (Polygon/MultiPolygon).
function ringsOf(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

export default function Atuacao() {
  const [geo, setGeo] = React.useState(null)
  const [erro, setErro] = React.useState(false)
  const [ativo, setAtivo] = React.useState(null) // pin em foco

  React.useEffect(() => {
    let vivo = true
    fetch('/df-ras.geojson')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nao encontrado'))))
      .then((data) => vivo && setGeo(data))
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [])

  const alvo = new Set((atuacao.areasAtuacao || []).map(normalize))

  // Calcula bounding box de todo o GeoJSON para projetar no viewBox.
  const projecao = React.useMemo(() => {
    if (!geo || !geo.features) return null
    let minLon = Infinity,
      maxLon = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity
    for (const f of geo.features) {
      for (const ring of ringsOf(f.geometry)) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
      }
    }
    if (!isFinite(minLon)) return null
    const W = 1000
    const latMid = (minLat + maxLat) / 2
    const kx = Math.cos((latMid * Math.PI) / 180) || 1
    const spanLon = (maxLon - minLon) * kx || 1
    const spanLat = maxLat - minLat || 1
    const H = (W * spanLat) / spanLon
    const project = (lon, lat) => {
      const x = ((lon - minLon) * kx * W) / spanLon
      const y = H - ((lat - minLat) * H) / spanLat // inverte Y (SVG cresce pra baixo)
      return [x, y]
    }
    return { W, H, project }
  }, [geo])

  const first = (atuacao.titulo || 'Onde eu atuo')

  return (
    <section className="atuacao section" id="atuacao">
      <div className="container">
        <h2 className="section__title">{first}</h2>
        <p className="section__lead">{atuacao.descricao}</p>

        {erro && (
          <div className="atuacao__placeholder card">
            <p>O mapa de atuacao sera publicado em breve.</p>
          </div>
        )}

        {!erro && !projecao && (
          <div className="atuacao__placeholder card">
            <p>Carregando mapa das regioes...</p>
          </div>
        )}

        {projecao && (
          <div className="atuacao__mapwrap">
            <svg
              className="atuacao__svg"
              viewBox={`0 0 ${projecao.W} ${projecao.H}`}
              role="img"
              aria-label="Mapa das regioes administrativas do Distrito Federal"
            >
              {geo.features.map((f, i) => {
                const nome = featureName(f.properties)
                const destaque = alvo.has(normalize(nome))
                const d = ringsOf(f.geometry)
                  .map(
                    (ring) =>
                      'M ' +
                      ring
                        .map(([lon, lat]) => projecao.project(lon, lat).join(' '))
                        .join(' L ') +
                      ' Z'
                  )
                  .join(' ')
                return (
                  <path
                    key={i}
                    d={d}
                    className={destaque ? 'ra ra--ativa' : 'ra'}
                  >
                    <title>{nome}</title>
                  </path>
                )
              })}

              {(atuacao.pins || []).map((p, i) => {
                const [x, y] = projecao.project(p.lng, p.lat)
                return (
                  <g
                    key={i}
                    className="pin"
                    transform={`translate(${x} ${y})`}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseLeave={() => setAtivo(null)}
                  >
                    <circle className="pin__halo" r="14" />
                    <circle className="pin__dot" r="7" />
                    {ativo === i && p.label && (
                      <text className="pin__label" x="0" y="-20" textAnchor="middle">
                        {p.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {(atuacao.areasAtuacao || []).length > 0 && (
              <ul className="atuacao__legenda">
                {atuacao.areasAtuacao.map((a) => (
                  <li key={a}>
                    <span className="atuacao__swatch" aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
