# Agente de Jingle (por voz / linguagem natural)

Instrucoes para um agente de codigo no VS Code (ex: Hermes) atender pedidos como:

> "Quero um jingle para o candidato Dr. Gutemberg no ritmo de pagode, com a letra que esta na pasta lyrics dele."

O agente NAO inventa musica sozinho: ele interpreta o pedido e roda o script
`tools/generate-jingles.mjs`, que chama a API Eleven Music da ElevenLabs.

## O que o agente deve fazer

1. **Identificar o candidato** no pedido e mapear para a pasta do site.
   - "Dr. Gutemberg" -> `sites/deputado-01` (ajuste o mapeamento conforme os slugs reais).
   - Se o candidato nao for claro, perguntar antes de gerar.

2. **Localizar a letra** em `sites/<slug>/assets/lyrics/` (arquivo `jingle.txt`,
   `letra.txt` ou o primeiro `.txt`). Se nao houver letra, avisar e parar.

3. **Capturar o ritmo/estilo** do pedido (pagode, forro, marchinha, sertanejo,
   rock, etc.) e escrever no `site.toml` do candidato o campo:
   ```toml
   jingle_estilo = "jingle de campanha animado, ritmo de pagode, coro alegre"
   ```
   Traduza o ritmo pedido para uma descricao rica de estilo (o Eleven Music
   responde melhor a descricoes do que a uma palavra so).

4. **Rodar o gerador**, restrito ao candidato pedido:
   ```bash
   cd remotion-video
   node tools/generate-jingles.mjs --site deputado-01 --force
   ```
   O `--force` regenera caso ja exista um jingle. O `--site` garante que so
   aquele candidato e processado (rapido, ideal para demo ao vivo).

5. **Devolver o resultado**: informar o caminho do MP3 gerado
   (`sites/deputado-01/assets/jingles/jingle.mp3`) e, se possivel, abrir/tocar.

## Requisitos

- `ELEVENLABS_API_KEY` no `.env` da raiz (ja configurado).
- Plano ElevenLabs com acesso ao Eleven Music (endpoint de musica).
- Node instalado; o script usa apenas `fetch` nativo e `fs`.

## Exemplo de conversa (o que dizer ao agente)

> Quero um jingle para o Dr. Gutemberg no ritmo de pagode, usando a letra que
> esta na pasta lyrics dele. Ajuste o estilo no site.toml e rode o gerador so
> para esse candidato.

O agente entao: define `jingle_estilo` de pagode no `sites/deputado-01/site.toml`,
roda `node tools/generate-jingles.mjs --site deputado-01 --force`, e retorna o
caminho do jingle gerado.

## Observacao de conformidade (TSE)

Jingle de campanha tem regras proprias de uso e periodo. Trate o audio gerado
como rascunho de producao; a peca final e o uso na propaganda seguem as normas
eleitorais vigentes.
