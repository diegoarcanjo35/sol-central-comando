# Recuperação de senha por e-mail

O botão **Esqueci minha senha** já está incluído. Para ativar o envio:

1. Crie uma conta no Resend e valide o domínio `elevesites.com.br`.
2. Gere uma API key.
3. No Worker da Cloudflare, abra **Configurações → Variáveis e segredos**.
4. Cadastre como segredo:
   - `RESEND_API_KEY`: a chave gerada no Resend.
5. Cadastre como variável:
   - `SOL_EMAIL_FROM`: `SOL <acesso@elevesites.com.br>`.
6. Implante as alterações e teste o botão em uma janela anônima.

O SOL não envia senha temporária. Ele envia um link individual que:

- expira em 48 horas;
- funciona uma única vez;
- é substituído quando um novo link é solicitado;
- permite criar uma nova senha e encerra as sessões anteriores.

Sem essas duas configurações, o login e a criação manual de senha continuam
funcionando, mas o envio automático de recuperação fica indisponível.
