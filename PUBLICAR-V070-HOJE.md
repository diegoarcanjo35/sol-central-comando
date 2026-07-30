# Publicação do MVP SOL v0.7.0

Siga esta ordem. Não torne o endereço público antes de criar a sua senha.

## 1. Enviar o pacote

Substitua os arquivos do repositório pelo conteúdo deste pacote e confirme um único commit na `main`.

A Cloudflare executará:

- construção: `chmod +x scripts/*.sh && npm run build`
- implantação: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

## 2. Criar a senha do proprietário

Enquanto o endereço de produção ainda estiver como **Restrito**:

1. Entre normalmente com o acesso atual da Cloudflare.
2. Abra **Ajustes**.
3. Vá até **Acesso**.
4. Crie uma senha com pelo menos 10 caracteres, letras e números.
5. Confirme que o painel informa que a senha já está definida.

## 3. Liberar a página de login

Na Cloudflare:

1. Abra o Worker `sol-central-comando`.
2. Entre em **Domínios**.
3. Na linha **Produção**, altere **Restrito** para **Público**.
4. Mantenha a **Pré-visualização** como restrita.

O conteúdo dos usuários continuará protegido pelo login do SOL. Tornar a URL pública apenas permite que a tela de login e os links de convite sejam abertos.

## 4. Teste obrigatório

1. Abra uma janela anônima.
2. Acesse a URL de produção.
3. Confirme que aparece a tela de login do SOL.
4. Entre com seu e-mail e a senha criada.
5. Confirme que seus projetos continuam visíveis.

## 5. Convidar alguém

1. Abra **Admin**.
2. Cadastre nome e e-mail.
3. Copie o link gerado.
4. Envie por WhatsApp ou e-mail.

O link expira em 48 horas e deixa de funcionar após o primeiro uso.
