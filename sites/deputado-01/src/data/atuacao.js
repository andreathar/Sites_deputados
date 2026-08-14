// ============================================================
// atuacao.js — dados do mapa de atuacao do candidato
//
// GERADO automaticamente por tools/generate-sites.mjs a partir da
// secao [atuacao] do site.toml. Edite o site.toml e re-genere
// (ou rode --sync) em vez de editar este arquivo na mao.
// ============================================================

export default {
  titulo: "Onde eu atuo",
  descricao: "Regioes do Distrito Federal onde concentro meu trabalho: atendimento nas comunidades, escuta ativa e prioridades de mandato.",

  // RAs destacadas no mapa. Os nomes precisam bater com os do
  // df-ras.geojson (ex: 'Ceilandia', 'Taguatinga', 'Plano Piloto').
  // Vazio = mapa neutro, sem destaque.
  areasAtuacao: [
  "Ceilandia",
  "Taguatinga",
  "Plano Piloto",
  "Sobradinho"
],

  // Pontos de interesse (lat/lng em graus decimais).
  pins: [
  {
    "lat": -15.8267,
    "lng": -47.9218,
    "label": "Comite central",
    "tipo": "comite"
  },
  {
    "lat": -15.78,
    "lng": -47.93,
    "label": "Gabinete",
    "tipo": "gabinete"
  },
  {
    "lat": -15.8069,
    "lng": -48.0756,
    "label": "Base na Ceilandia",
    "tipo": "base"
  }
],
}
