import {
  applyAssistantActions,
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
  recordUsage,
  requireUser,
  type Provider,
} from "../../../lib/sol";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const payload = await request.json() as { message?: string };
    const message = payload.message?.trim() ?? "";
    if (!message) return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });

    const [config, context, conversation] = await Promise.all([
      getSettings(auth.workspaceId),
      loadContext(auth.workspaceId),
      getOrCreateConversation(auth.workspaceId),
    ]);
    const provider = config.activeProvider as Provider;
    const prior = await recentMessages(auth.workspaceId, conversation.id);
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
    await recordMessage(auth.workspaceId, conversation.id, "user", message);
    const result = await callProvider(provider, assistantSystemPrompt(config), userPrompt, config);
    const parsed = parseAssistantPayload(result.text);
    const applied = await applyAssistantActions(auth.workspaceId, parsed.actions);
    await recordMessage(auth.workspaceId, conversation.id, "assistant", parsed.reply, provider);
    await recordUsage({
      userId: auth.user.id,
      workspaceId: auth.workspaceId,
      provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
    if (!conversation.greetedAt) await markGreeted(auth.workspaceId, conversation.id);
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
