// ============================================================
// atuacao.js — dados do mapa de atuacao do candidato
//
// Este arquivo e preenchido MANUALMENTE com o que cada deputado passar.
// Nao vai para o site publico nada de emendas, valores ou politica interna:
// aqui e so a mensagem para o eleitor (onde atuo, minha regiao).
// ============================================================

export default {
  // Titulo e texto da secao (ajuste por candidato se quiser).
  titulo: 'Onde eu atuo',
  descricao:
    'As regioes do Distrito Federal onde concentro meu trabalho e minhas prioridades.',

  // Nomes das Regioes Administrativas (RAs) de atuacao.
  // Precisam bater EXATAMENTE com a propriedade de nome no df-ras.geojson
  // (ex: 'Ceilandia', 'Taguatinga', 'Plano Piloto'...).
  // Deixe [] enquanto o deputado nao passar; o mapa mostra todas as RAs neutras.
  areasAtuacao: [
    // 'Ceilandia',
    // 'Taguatinga',
  ],

  // Pontos de interesse que o deputado vai passar depois.
  // lat/lng em graus decimais. label aparece ao passar o mouse / tocar.
  // Ex: { lat: -15.8267, lng: -47.9218, label: 'Comite central', tipo: 'comite' }
  pins: [
    // { lat: -15.8267, lng: -47.9218, label: 'Comite central', tipo: 'comite' },
  ],
}
