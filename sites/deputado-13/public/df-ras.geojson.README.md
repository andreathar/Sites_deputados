# df-ras.geojson

A secao **Atuacao** (`src/sections/Atuacao.jsx`) le um arquivo
`public/df-ras.geojson` com as **Regioes Administrativas do Distrito Federal**.

Esse arquivo NAO esta versionado aqui (o GeoJSON oficial e grande e muda de
tempos em tempos). Baixe a versao atual e salve como `public/df-ras.geojson`.

## Onde baixar

- Geoportal do DF (SEDUH): camada de Regioes Administrativas.
- IBGE / bases abertas de limites do DF.
- Qualquer GeoJSON de RAs do DF em coordenadas geograficas (lon, lat / WGS84).

## Formato esperado

`FeatureCollection` com features de `Polygon` ou `MultiPolygon`. Cada feature
precisa ter o **nome da RA** em uma destas propriedades (a secao tenta todas):
`name`, `NOME`, `nome`, `ra_nome`, `RA_NOME`, `NM_RA`, `regiao`.

O nome precisa bater com os valores em `src/data/atuacao.js > areasAtuacao`
(a comparacao ignora acentos e maiusculas).

## Dica de tamanho

Se o arquivo passar de ~1-2 MB, simplifique a geometria (ex: mapshaper.org,
"Simplify" a 5-10%). O mapa da secao nao precisa de precisao cartografica,
so do contorno das RAs.
