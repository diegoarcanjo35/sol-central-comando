# Histórico de versões

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
