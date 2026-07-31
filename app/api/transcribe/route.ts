import {
  errorResponse,
  getCredential,
  recordUsage,
  requireUser,
} from "../../../lib/sol";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const form = await request.formData();
    const audio = form.get("audio");
    const audioDurationSeconds = Math.min(
      3600,
      Math.max(0, Number(form.get("durationSeconds")) || 0),
    );
    if (!(audio instanceof File)) {
      return Response.json({ error: "Áudio não recebido." }, { status: 400 });
    }
    if (audio.size > 15 * 1024 * 1024) {
      return Response.json({ error: "O áudio deve ter no máximo 15 MB." }, { status: 413 });
    }
    const upstream = new FormData();
    upstream.set("file", audio, audio.name || "gravacao.webm");
    upstream.set("model", "gpt-4o-mini-transcribe");
    upstream.set("language", "pt");
    upstream.set("response_format", "json");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${await getCredential("openai")}` },
      body: upstream,
    });
    const data = await response.json() as { text?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message ?? "Não foi possível transcrever o áudio.");
    await recordUsage({
      userId: auth.user.id,
      workspaceId: auth.workspaceId,
      provider: "openai",
      model: "gpt-4o-mini-transcribe",
      operation: "transcription",
      audioBytes: audio.size,
      audioDurationSeconds,
    });
    return Response.json({ text: data.text?.trim() ?? "" });
  } catch (error) {
    return errorResponse(error);
  }
}
