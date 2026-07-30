# SOL — Central de Comando

Aplicativo mobile-first multiusuário para gerenciar projetos, atividades, memória, prioridades e execução com assistência de IA.

## Versão

`v0.7.0 MVP`

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
- autenticação por Cloudflare Access e autorização interna por usuário;
- workspace, projetos, memória, conversas e cache isolados por conta;
- onboarding para personalizar nome, missão, tom, cobrança, iniciativa e apoio a TDAH;
- painel administrativo para cadastrar, suspender e acompanhar o uso dos usuários;
- APIs e provedor ativo controlados somente por administradores;
- medição de chamadas, tokens e transcrições por usuário.
- login próprio com senha e sessão segura;
- convites e redefinições por link individual de uso único;
- proteção contra tentativas repetidas de login.

## Provedores padrão

- OpenAI: `gpt-5.6-terra`;
- Google: `gemini-3.6-flash`;
- Anthropic: `claude-sonnet-5`;
- transcrição: `gpt-4o-mini-transcribe`.

As chaves e o provedor ativo são administrados em **Ajustes** apenas pelo administrador.

## Segurança

- nunca envie `.env` ou chaves de API para o GitHub;
- `.env*` está bloqueado pelo `.gitignore`;
- as chaves cadastradas na interface são criptografadas antes de serem salvas;
- `SOL_ENCRYPTION_KEY` existe somente nas variáveis protegidas da hospedagem;
- cada consulta e alteração é limitada ao workspace do usuário autenticado;
- cadastros são liberados por convite durante a fase beta;
- além do cadastro no SOL, cada e-mail precisa ser autorizado na política do Cloudflare Access.

## Primeiro acesso de um usuário

1. O administrador cadastra nome e e-mail na aba **Admin**.
2. O SOL gera um link válido por 48 horas.
3. O administrador envia o link por WhatsApp ou e-mail.
4. A pessoa cria a senha e personaliza sua IA.
5. Um workspace privado é criado automaticamente e permanece separado dos demais.

O SOL não lê automaticamente a memória privada de uma conta do ChatGPT. Uma importação revisável por arquivo de exportação está prevista para uma versão futura.

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
