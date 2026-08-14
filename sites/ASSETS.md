# Convencao de assets por site

Cada site de candidato tem uma pasta `assets/` para o material grafico:

```
sites/deputado-XX/assets/
  foto/     # foto(s) do candidato (idealmente PNG com fundo transparente)
  logo/     # logomarca do candidato
  video/    # video(s) opcionais
  lyrics/   # letra do jingle (jingle.txt ou qualquer .txt)
  jingles/  # jingle gerado (jingle.mp3) - produzido pelo generate-jingles.mjs
```

Essas pastas sao alimentadas pelo time de conteudo (via Google Drive) e consumidas pelo build dos sites e pela geracao das intros.

## Jingle (audio da intro)

1. Coloque a letra do jingle em `sites/deputado-XX/assets/lyrics/` (ex.: `jingle.txt`).
2. Gere o audio com a ElevenLabs (chave `ELEVENLABS_API_KEY` em `.env` na raiz):
   `node remotion-video/tools/generate-jingles.mjs`
   - Processa todos os sites que tem letra; use `--site deputado-01` para um so.
   - Use `--force` para regenerar mesmo se `jingle.mp3` ja existir.
   - Voz padrao: Liam (energico, otimo para campanha). Para mudar por deputado,
     adicione `jingle_voice = "<voice_id>"` no `site.toml`.
3. O audio sai em `sites/deputado-XX/assets/jingles/jingle.mp3` e o
   `sync-assets.mjs` o copia para `public/candidatos/<slug>/` automaticamente.

Lista de vozes disponiveis:
`node remotion-video/tools/list-voices.mjs`

## Para mockup

Pode soltar fotos de teste (ex: fotos do proprio Andre) em `sites/deputado-01/assets/foto/` para ver o layout funcionando antes dos assets reais chegarem. Formatos aceitos: PNG (preferido, permite transparencia), JPG.

## Ligacao com as intros do Remotion

O template do Remotion le de `remotion-video/public/candidatos/<slug>/`. Quando os assets de um site estiverem prontos, copie `foto.png` e `logo.png` para a pasta correspondente em `public/candidatos/`, ou aponte o pipeline para reutilizar estes diretorios. Manter o mesmo `<slug>` nos dois lugares evita retrabalho.
