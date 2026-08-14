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
node tools/render-batch.mjs          # renderiza vinheta de Intro padrão
node tools/render-batch.mjs --composition QuotePost # renderiza vídeos no template Frase/Citação
```

O `fetch-candidatos.mjs` avisa quais candidatos estao sem numero ou mensagem, em vez de gerar video incompleto.

### Passo adicional: Upload dos vídeos para o ClickUp

```bash
export CLICKUP_TOKEN=pk_seu_token
node tools/upload-clickup.mjs        # anexa os MP4s das intros diretamente nas tarefas do ClickUp
```

## Assets (foto e logo)

O template le os caminhos relativos a `public/`. A convencao e:

```
public/candidatos/<slug>/foto-raw.png   # foto original (qualquer fundo)
public/candidatos/<slug>/foto.png        # gerada pelo recorte (fundo transparente)
public/candidatos/<slug>/logo.png
```

O `<slug>` vem do nome do candidato (minusculo, sem acento, com hifens). Se a foto ou a logo nao existir, o template mostra um placeholder no lugar, entao nada quebra durante a demo.

## Recorte de fundo automatico (rembg)

O Remotion nao remove fundo: ele usa a imagem que voce fornecer. Por isso o batch tem um passo de recorte que roda **antes** da renderizacao.

Coloque a foto original de cada candidato como `foto-raw.png` (ou .jpg/.jpeg/.webp) na pasta dele. Ao rodar o batch, `tools/prep-fotos.mjs` gera `foto.png` com o fundo removido, que e o que o template usa. O recorte e idempotente: so processa fotos novas ou alteradas.

Requisito (uma vez):

```bash
pipx install rembg        # recomendado
# ou: pip install "rembg[cli]"
```

Se o rembg nao estiver instalado, o batch avisa e segue em frente usando o `foto.png` existente (ou o placeholder). Para pular o recorte de proposito:

```bash
node tools/render-batch.mjs --skip-prep
```

Para recortar sem renderizar:

```bash
node tools/prep-fotos.mjs
```

## Especificacoes fixas

- Resolucao: 1080x1920 (vertical, reels/stories)
- Duracao: 150 frames (5s a 30fps)
- Selo do TSE sempre visivel (exigencia legal)
