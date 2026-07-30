# Atualização única — SOL v0.6.0

## O que esta versão faz

- preserva os projetos, atividades, histórico, memórias e chaves já existentes;
- vincula os dados atuais ao workspace privado de Diego;
- adiciona usuários, onboarding, painel administrativo e medição de uso;
- impede que uma conta consulte ou altere dados de outra;
- mantém as APIs sob controle exclusivo do proprietário.

## Publicação

1. Extraia o pacote.
2. Substitua o conteúdo do repositório pelos arquivos extraídos, preservando as pastas.
3. Envie tudo para a branch `main` em um único commit, por exemplo: `SOL v0.6.0 multiusuário`.
4. Aguarde a implantação automática da Cloudflare.

Os comandos já configurados devem permanecer:

- construção: `chmod +x scripts/*.sh && npm run build`
- implantação: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

A migração `0001_multiuser_foundation.sql` é aplicada automaticamente antes da nova versão entrar no ar.

## Conferência após publicar

1. Abra o painel com o e-mail `elevensites04@gmail.com`.
2. Confirme que os projetos atuais continuam visíveis.
3. Abra **Admin** e confira o usuário Diego como proprietário.
4. Abra **Ajustes** e confira as APIs e a IA ativa.
5. Crie uma atividade de teste e converse com a SOL.

## Liberar Andreia ou outra pessoa

1. Cadastre nome e e-mail na aba **Admin** do SOL.
2. Na Cloudflare Access, adicione exatamente o mesmo e-mail à política que protege o aplicativo.
3. A pessoa entra usando esse e-mail e responde ao onboarding.

O novo usuário começa com um workspace vazio e privado. Nenhum projeto de Diego é copiado ou exibido.
