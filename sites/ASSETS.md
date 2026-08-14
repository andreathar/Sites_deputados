# Convencao de assets por site

Cada site de candidato tem uma pasta `assets/` para o material grafico:

```
sites/deputado-XX/assets/
  foto/     # foto(s) do candidato (idealmente PNG com fundo transparente)
  logo/     # logomarca do candidato
  video/    # video(s) opcionais
```

Essas pastas sao alimentadas pelo time de conteudo (via Google Drive) e consumidas pelo build dos sites e pela geracao das intros.

## Para mockup

Pode soltar fotos de teste (ex: fotos do proprio Andre) em `sites/deputado-01/assets/foto/` para ver o layout funcionando antes dos assets reais chegarem. Formatos aceitos: PNG (preferido, permite transparencia), JPG.

## Ligacao com as intros do Remotion

O template do Remotion le de `remotion-video/public/candidatos/<slug>/`. Quando os assets de um site estiverem prontos, copie `foto.png` e `logo.png` para a pasta correspondente em `public/candidatos/`, ou aponte o pipeline para reutilizar estes diretorios. Manter o mesmo `<slug>` nos dois lugares evita retrabalho.
