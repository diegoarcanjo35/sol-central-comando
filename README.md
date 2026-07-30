# SOL — Central de Comando

Aplicativo pessoal mobile-first para gerenciar projetos, atividades, memória, prioridades e execução com assistência de IA.

## Versão

`v0.5.0 beta`

## Recursos

- projetos e atividades persistidos em Cloudflare D1;
- datas, atrasos, prioridades, recorrência e projetos sem atualização;
- histórico automático de decisões e alterações;
- assistente SOL com memória e cache de contexto;
- OpenAI, Google Gemini e Anthropic Claude usando o mesmo banco;
- provedor ativo selecionável no painel;
- chaves de API criptografadas no servidor;
- gravação de áudio segura e resposta somente por texto;
- PWA instalável no celular.

## Provedores padrão

- OpenAI: `gpt-5.6-terra`;
- Google: `gemini-3.6-flash`;
- Anthropic: `claude-sonnet-5`;
- transcrição: `gpt-4o-mini-transcribe`.

Os modelos podem ser alterados em **Ajustes** sem modificar o código.

## Segurança

- nunca envie `.env` ou chaves de API para o GitHub;
- `.env*` está bloqueado pelo `.gitignore`;
- as chaves cadastradas na interface são criptografadas antes de serem salvas;
- `SOL_ENCRYPTION_KEY` existe somente nas variáveis protegidas da hospedagem;
- a aplicação permanece restrita ao proprietário durante a fase beta.

## Desenvolvimento

Requisitos:

- Node.js `>=22.13.0`;
- npm;
- ambiente compatível com Cloudflare Workers.

```bash
npm ci
npm run db:generate
npm run lint
npm run build
```

## Estrutura

- `app/page.tsx`: painel e interações;
- `app/api/`: endpoints do aplicativo;
- `lib/sol.ts`: memória, cache, segurança e roteador de IA;
- `db/schema.ts`: estrutura do banco;
- `drizzle/`: migrações aplicadas na publicação;
- `.openai/hosting.json`: vínculos lógicos da hospedagem.

Consulte [CHANGELOG.md](CHANGELOG.md) para o histórico.
