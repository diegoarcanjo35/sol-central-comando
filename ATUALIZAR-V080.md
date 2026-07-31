# Atualização do SOL para v0.8.0

Esta versão adiciona o custo estimado de IA em reais ao painel administrativo.

## Publicação

Use os mesmos comandos já configurados na Cloudflare:

- construção: `chmod +x scripts/*.sh && npm run build`
- implantação: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

A migração `0003_watery_stick.sql` é aditiva: ela cria somente as tabelas de preços
e adiciona a duração dos áudios. Projetos, atividades, usuários, memórias e
conversas existentes são preservados.

## Configuração após publicar

1. Entre no SOL com a conta proprietária.
2. Abra **Admin**.
3. Em **Custos de IA**, informe a cotação USD → BRL.
4. Copie da página oficial de cada provedor o preço por 1 milhão de tokens de
   entrada e saída do modelo configurado.
5. Informe também o preço por minuto do modelo de transcrição.
6. Clique em **Salvar preços**.

Enquanto um modelo não tiver preço, o painel identifica suas chamadas como
**sem preço** em vez de mostrar um custo artificialmente zerado.
