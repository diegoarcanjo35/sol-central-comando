import {
  applyAssistantActions,
  assertAuthenticated,
  assistantSystemPrompt,
  callProvider,
  errorResponse,
  getOrCreateConversation,
  getSettings,
  greetingFor,
  loadContext,
  markGreeted,
  parseAssistantPayload,
  recentMessages,
  recordMessage,
  type Provider,
} from "../../../lib/sol";

export async function POST(request: Request) {
  try {
    assertAuthenticated(request);
    const payload = await request.json() as { message?: string };
    const message = payload.message?.trim() ?? "";
    if (!message) return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });

    const [config, context, conversation] = await Promise.all([
      getSettings(),
      loadContext(),
      getOrCreateConversation(),
    ]);
    const provider = config.activeProvider as Provider;
    const prior = await recentMessages(conversation.id);
    const greeting = greetingFor(config.userName, Boolean(conversation.greetedAt));
    const userPrompt = JSON.stringify({
      currentDate: new Date().toISOString(),
      timezone: "America/Sao_Paulo",
      greetingInstruction: greeting
        ? `Comece a reply com "${greeting}" e não repita essa saudação nas próximas mensagens de hoje.`
        : "Já houve conversa hoje. Não faça nova saudação de bom dia, boa tarde ou boa noite.",
      context: JSON.parse(context.value),
      recentConversation: prior.map((item) => ({ role: item.role, content: item.content })),
      userMessage: message,
    });
    await recordMessage(conversation.id, "user", message);
    const raw = await callProvider(provider, assistantSystemPrompt(config), userPrompt, config);
    const parsed = parseAssistantPayload(raw);
    const applied = await applyAssistantActions(parsed.actions);
    await recordMessage(conversation.id, "assistant", parsed.reply, provider);
    if (!conversation.greetedAt) await markGreeted(conversation.id);
    return Response.json({
      reply: parsed.reply,
      applied,
      provider,
      cacheHit: context.cacheHit,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
