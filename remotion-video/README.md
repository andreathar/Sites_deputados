# Intros de Campanha (Remotion)

Vinhetas de abertura de 5 segundos para os videos dos candidatos: foto + fundo animado + logo + numero + mensagem. **Nao e o candidato falando** (isso violaria as regras do TSE): e motion graphics de marca, usado como intro do video onde o candidato real aparece depois. Todo video sai com o selo obrigatorio de conteudo produzido com IA.

## Rodar o Studio (edicao ao vivo)

```bash
cd remotion-video
npm install
npm run dev        # abre o Remotion Studio (porta 3001)
```

Na barra lateral, clique na composicao **Intro**. Os campos (nome, numero, mensagem, cor, caminho da foto e da logo) sao editaveis em tempo real pelos controles. Otimo para demonstrar o conceito sem renderizar nada.

## Gerar o lote de videos

### Opcao A: com dados de exemplo (mock)

```bash
node tools/render-batch.mjs --mock
```

Le `candidatos.mock.json` e gera um MP4 por candidato em `out/`. Nao depende do ClickUp, ideal para testar.

### Opcao B: com dados reais do ClickUp

```bash
export CLICKUP_TOKEN=pk_seu_token   # Personal API Token do ClickUp
node tools/fetch-candidatos.mjs      # gera candidatos.json a partir do Cadastro de Deputados
node tools/render-batch.mjs          # renderiza usando candidatos.json
```

O `fetch-candidatos.mjs` avisa quais candidatos estao sem numero ou mensagem, em vez de gerar video incompleto.

## Assets (foto e logo)

O template le os caminhos relativos a `public/`. A convencao e:

```
public/candidatos/<slug>/foto.png
public/candidatos/<slug>/logo.png
```

O `<slug>` vem do nome do candidato (minusculo, sem acento, com hifens). Se a foto ou a logo nao existir, o template mostra um placeholder no lugar, entao nada quebra durante a demo.

## Sobre remocao de fundo

O Remotion **nao** remove fundo de foto: ele apenas usa a imagem que voce fornecer. Para o candidato aparecer recortado sobre o fundo animado, entregue a foto como **PNG com transparencia**. Opcoes para recortar antes:

- `rembg` (open-source, roda local) — bom para automatizar dentro do batch
- API do remove.bg
- Photoshop / editor manual

Se a foto ja vier transparente do time grafico, e so soltar na pasta do candidato.

## Especificacoes fixas

- Resolucao: 1080x1920 (vertical, reels/stories)
- Duracao: 150 frames (5s a 30fps)
- Selo do TSE sempre visivel (exigencia legal)
