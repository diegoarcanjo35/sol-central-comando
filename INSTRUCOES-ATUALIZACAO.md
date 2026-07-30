# SOL — atualização única para v0.5.0-beta

Este pacote contém o código completo da versão v0.5.0-beta.

## Como atualizar o GitHub

1. Abra o repositório `diegoarcanjo35/sol-central-comando`.
2. Clique em **Add file > Upload files**.
3. Abra esta pasta no seu computador e arraste **todo o conteúdo de dentro dela** para a tela do GitHub.
4. Aguarde o carregamento e confirme o commit com a mensagem:
   `release: v0.5.0-beta`
5. Não crie a release ainda. Primeiro teste a versão publicada no celular.
6. Quando os testes passarem, crie uma única release com a tag:
   `v0.5.0-beta`

## Atenção ao arquivo oculto

O pacote inclui `.openai/hosting.json`. Se o navegador não enviar a pasta
`.openai`, abra esse arquivo manualmente no GitHub e deixe seu conteúdo assim:

```json
{
  "project_id": "appgprj_6a6af90c399c8191bc6d687ce7730795",
  "d1": "DB",
  "r2": null
}
```

## Teste rápido no celular

1. Criar um projeto.
2. Criar e concluir uma atividade.
3. Abrir **Ajustes** e cadastrar a chave de pelo menos uma IA.
4. Abrir **SOL** e pedir por texto para criar uma atividade.
5. Gravar um áudio e conferir a transcrição.

Para transcrever áudio é necessário cadastrar uma chave da OpenAI. A IA que
responde ao texto pode ser OpenAI, Google Gemini ou Anthropic.

Nunca envie chaves de API para o GitHub. Elas devem ser cadastradas somente
dentro do painel do SOL.
