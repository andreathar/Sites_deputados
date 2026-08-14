# Candidato de teste (mockup)

Solte aqui uma foto sua para testar o pipeline de ponta a ponta.

## Com recorte automatico de fundo (recomendado)

1. Salve a foto original como `foto-raw.png` (ou .jpg) nesta pasta.
2. Rode na raiz de `remotion-video`:
   ```bash
   node tools/render-batch.mjs --mock
   ```
   O passo de recorte gera `foto.png` transparente e a renderizacao usa ela.

## Sem recorte (foto ja pronta)

Se voce ja tem um PNG transparente, salve direto como `foto.png` e rode:
```bash
node tools/render-batch.mjs --mock --skip-prep
```

## So visualizar no Studio

Coloque `foto.png` aqui, abra `npm run dev` e selecione a composicao Intro.
Se nao houver foto, o template mostra um placeholder no lugar.
