# SOL — Central de Comando

Painel pessoal, mobile-first, para organizar atividades, projetos, decisões e cobranças estratégicas.

## Versão

`v0.1.1` — correção de segurança e compatibilidade do acesso à SOL.

Esta versão registra a interface e a experiência inicial do produto. Os dados exibidos são demonstrativos e ficam apenas na memória do navegador enquanto a página está aberta.

## O que já existe

- painel inicial com foco, atrasos, atividades do dia e projetos sem atualização;
- navegação entre Início, Atividades, Projetos, Histórico e Ajustes;
- marcação visual de atividades concluídas;
- configuração visual de OpenAI, Google Gemini e Anthropic Claude;
- interface da assistente SOL com entrada por texto;
- abertura segura da SOL, com entrada por texto ou pelo microfone do teclado;
- manifesto PWA para instalação na tela inicial do celular;
- layout responsivo para celular e computador.

## O que ainda não está conectado

- banco de dados e persistência;
- autenticação própria;
- APIs de OpenAI, Google Gemini e Anthropic;
- cache de contexto e memória compartilhada entre provedores;
- criação e atualização real de projetos pela assistente;
- transcrição de áudio por serviço externo;
- domínio personalizado e infraestrutura definitiva.

## Entrada por voz nesta versão

O botão **SOL** apenas abre a conversa e não solicita acesso direto ao microfone. Para ditar uma mensagem, use o microfone do próprio teclado do celular. A captura de áudio interna será implementada em uma versão futura com fallback seguro.

## Executar localmente

Requisitos:

- Node.js `>=22.13.0`;
- npm;
- Linux para os scripts auxiliares de build atuais.

```bash
npm ci
npm run dev
```

O terminal exibirá o endereço local da aplicação.

## Validar

```bash
npm run build
npm test
```

## Arquitetura atual

- Next.js 16;
- React 19;
- TypeScript;
- Vinext/Vite;
- suporte preparado para Cloudflare Workers e D1;
- Drizzle ORM preparado, ainda sem tabelas.

O arquivo `.openai/hosting.json` contém somente o identificador do projeto publicado no Sites. Ele não é uma credencial nem uma chave secreta.

## Próximas versões sugeridas

- `v0.2.0`: atividades e projetos persistidos em D1;
- `v0.3.0`: memória, cache de contexto e troca de provedor de IA;
- `v0.4.0`: captura/transcrição de áudio com fallback seguro;
- `v1.0.0`: versão pessoal estável no domínio definitivo.

Consulte [CHANGELOG.md](CHANGELOG.md) para o histórico e [docs/PRIMEIRO-ENVIO-GITHUB.md](docs/PRIMEIRO-ENVIO-GITHUB.md) para publicar este pacote.
