# Histórico de versões

## [0.8.0] — 2026-07-31

### Custos de IA em reais

- converte o consumo mensal de cada usuário para reais;
- preserva chamadas e tokens nos detalhes para auditoria;
- calcula separadamente tokens de entrada, saída e minutos de transcrição;
- usa o provedor e o modelo exatos registrados em cada chamada;
- adiciona no painel administrativo a cotação USD/BRL e os preços dos modelos;
- sinaliza chamadas que ainda não possuem preço configurado, evitando mostrar custo zero enganoso;
- registra a duração dos novos áudios para calcular o custo de transcrição;
- mantém registros históricos e todos os dados dos usuários sem alterações destrutivas.

## [0.7.1] — 2026-07-30

### Correção urgente

- ajusta o PBKDF2-SHA-256 para o limite de 100 mil iterações aceito pela Cloudflare;
- corrige a criação e a validação de senhas no Worker;
- adiciona “Esqueci minha senha” com link único enviado por e-mail;
- limita solicitações repetidas de recuperação;
- não altera usuários, projetos, tarefas ou demais dados existentes.

## [0.7.0] — 2026-07-30

### MVP de acesso

- login próprio do SOL com e-mail e senha;
- senhas protegidas com PBKDF2-SHA-256, salt individual e 100 mil iterações;
- sessões persistentes com tokens aleatórios armazenados somente como hash;
- convites individuais de uso único, válidos por 48 horas;
- criação e redefinição de senha pelo mesmo fluxo seguro;
- revogação automática de links anteriores quando um novo é gerado;
- bloqueio temporário após tentativas repetidas de login;
- logout e suspensão de contas;
- transição compatível com o acesso atual da Cloudflare, sem risco de bloquear o proprietário.

### Mantido fora do MVP

- cobrança e assinaturas;
- notificações push;
- importação da memória do ChatGPT.

## [0.6.0] — 2026-07-30

### Adicionado

- contas por e-mail autenticado no Cloudflare Access;
- workspace privado para cada usuário;
- onboarding para personalidade, missão, motivação, cobrança, iniciativa e apoio a TDAH;
- painel administrativo com cadastro, ativação, suspensão, plano e consumo;
- medição de chamadas, tokens e volume de áudio por usuário;
- perfis de administrador e usuário comum.

### Segurança

- isolamento obrigatório de projetos, atividades, memórias, histórico, conversas, mensagens e cache;
- APIs e seleção do provedor disponíveis somente para administradores;
- migração aditiva que atribui todos os dados existentes ao workspace de Diego;
- atualizações e exclusões protegidas simultaneamente por ID e workspace;
- usuários não cadastrados ou suspensos são bloqueados pelo servidor.

## [0.5.0] — 2026-07-30

### Adicionado

- banco D1 com projetos, atividades, histórico, memórias, conversas e configurações;
- criação, edição, conclusão e exclusão real de projetos e atividades;
- painel calculado a partir dos dados persistidos;
- contexto compartilhado entre OpenAI, Google Gemini e Anthropic Claude;
- cache de contexto com invalidação após alterações;
- saudação inteligente, sem repetição durante o mesmo dia;
- personalidade incisiva e orientada a recorrência, automação e execução;
- ações estruturadas da SOL para criar e atualizar registros;
- armazenamento criptografado das chaves de API;
- seleção do provedor ativo e configuração dos modelos;
- gravação segura com `MediaRecorder` e transcrição em texto;
- histórico automático de alterações.

### Segurança

- chaves nunca são devolvidas ao navegador;
- credenciais são criptografadas antes de serem gravadas;
- variável mestra de criptografia armazenada apenas na hospedagem;
- arquivos `.env` continuam fora do GitHub.

## [0.1.1] — 2026-07-30

- removido o reconhecimento de voz experimental que podia travar navegadores móveis;
- botão da SOL passou a abrir a conversa de forma segura.

## [0.1.0] — 2026-07-30

- primeiro protótipo navegável da SOL — Central de Comando.
