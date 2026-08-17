# Publicação inicial dos sites placeholder

Os 30 projetos em `sites/deputado-XX/` são aplicações Vite já prontas para
Cloudflare Pages. Enquanto os domínios e dados finais não chegam, publique-os
na branch de preview `placeholder`:

```text
https://placeholder.deputado-01.pages.dev
https://placeholder.deputado-02.pages.dev
...
https://placeholder.deputado-30.pages.dev
```

O sufixo pode variar apenas se um nome de projeto já estiver ocupado na conta
Cloudflare. O Wrangler informa a URL real ao concluir o deploy.

## Prévia segura

Este passo não instala, compila nem cria recursos:

```text
node tools/deploy-placeholder-sites.mjs --all --build --deploy
```

## Preparar os builds

Na primeira execução, 29 projetos ainda precisam das dependências Vite. O
comando abaixo instala apenas onde `node_modules/vite` não existe e compila
todos os sites:

```text
node tools/deploy-placeholder-sites.mjs --all --build --install --apply
```

## Publicar na Cloudflare Pages

Com sessão autenticada no Wrangler, o lote abaixo cria os projetos Pages que
ainda não existirem e envia cada `dist/` para a branch temporária:

```text
node tools/deploy-placeholder-sites.mjs --all --build --deploy --apply
```

Cada projeto Pages é criado com `main` como branch de produção, mas esta
operação publica em `placeholder`; portanto, não promove os conteúdos genéricos
como site final. Quando o domínio definitivo estiver comprado e o conteúdo do
candidato aprovado, faça um deploy da branch de produção após validação.

## Newsletter durante a fase placeholder

Os sites têm uma Function `/api/subscribe`, mas o binding `NEWSLETTER_KV` ainda
não foi provisionado. O deploy direto do Pages detecta a pasta `functions/` e
publica a Function, que continua respondendo ao formulário; sem o binding, ela
não persiste e-mails. Não use esta fase para captação real.

Durante o deploy placeholder, o script oculta e restaura automaticamente o
`wrangler.toml` de produção. Isso evita que o ID provisório do KV seja validado
pela Cloudflare; o arquivo é restaurado mesmo quando o deploy falha.

Antes de habilitar captação, crie ou associe um namespace KV real em cada
projeto (ou implemente uma rota centralizada), atualize o `wrangler.toml`
correspondente e então publique a versão de produção.