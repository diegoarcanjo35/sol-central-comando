import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { providerCredentials, settings } from "../../../db/schema";
import {
  assertAuthenticated,
  credentialStatus,
  errorResponse,
  getSettings,
  nowIso,
  PROVIDERS,
  saveCredential,
  type Provider,
} from "../../../lib/sol";

export async function GET(request: Request) {
  try {
    assertAuthenticated(request);
    return Response.json({
      settings: await getSettings(),
      credentials: await credentialStatus(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAuthenticated(request);
    const payload = await request.json() as Record<string, unknown>;
    const activeProvider = typeof payload.activeProvider === "string" && PROVIDERS.includes(payload.activeProvider as Provider)
      ? payload.activeProvider
      : undefined;
    const db = await getDb();
    await db.update(settings).set({
      ...(activeProvider ? { activeProvider } : {}),
      ...(typeof payload.openaiModel === "string" ? { openaiModel: payload.openaiModel.trim() } : {}),
      ...(typeof payload.googleModel === "string" ? { googleModel: payload.googleModel.trim() } : {}),
      ...(typeof payload.anthropicModel === "string" ? { anthropicModel: payload.anthropicModel.trim() } : {}),
      ...(typeof payload.userName === "string" ? { userName: payload.userName.trim() || "Diego" } : {}),
      ...(typeof payload.mission === "string" ? { mission: payload.mission.trim() } : {}),
      ...(payload.monthlyGoal !== undefined ? { monthlyGoal: Math.max(0, Number(payload.monthlyGoal) || 0) } : {}),
      updatedAt: nowIso(),
    }).where(eq(settings.id, 1)).run();
    return Response.json({ settings: await getSettings() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertAuthenticated(request);
    const payload = await request.json() as { provider?: string; apiKey?: string };
    if (!payload.provider || !PROVIDERS.includes(payload.provider as Provider)) {
      return Response.json({ error: "Provedor inválido." }, { status: 400 });
    }
    if (!payload.apiKey) return Response.json({ error: "Informe a chave de API." }, { status: 400 });
    await saveCredential(payload.provider as Provider, payload.apiKey);
    return Response.json({ ok: true, credentials: await credentialStatus() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertAuthenticated(request);
    const provider = new URL(request.url).searchParams.get("provider") as Provider | null;
    if (!provider || !PROVIDERS.includes(provider)) {
      return Response.json({ error: "Provedor inválido." }, { status: 400 });
    }
    const db = await getDb();
    await db.delete(providerCredentials).where(eq(providerCredentials.provider, provider)).run();
    return Response.json({ ok: true, credentials: await credentialStatus() });
  } catch (error) {
    return errorResponse(error);
  }
}
