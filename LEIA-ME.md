# Configuração Cloudflare do SOL

Envie para a raiz do repositório `diegoarcanjo35/sol-central-comando`:

- `wrangler.jsonc`
- `vite.config.ts`
- a pasta `public` completa

O `vite.config.ts` deve substituir o arquivo existente.

Não remova `.openai/hosting.json`: ele pode permanecer no histórico enquanto a
migração do OpenAI Sites para a Cloudflare é validada.

Depois do upload, use na Cloudflare:

- Build command: `npm run build`
- Deploy command:
  `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
- Path: `/`

Durante a primeira configuração, desative builds para branches que não sejam de
produção. Assim, somente a branch `main` poderá publicar e aplicar migrações no
banco de produção.
