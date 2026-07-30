import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assistantProfiles, users } from "../../../db/schema";
import {
  errorResponse,
  getAssistantProfile,
  nowIso,
  requireUser,
} from "../../../lib/sol";

type OnboardingPayload = {
  userName?: string;
  assistantName?: string;
  mission?: string;
  motivation?: string;
  tone?: string;
  challengeLevel?: number;
  initiativeLevel?: number;
  adhdSupport?: boolean;
  focusAreas?: string;
  workHours?: string;
  quietHours?: string;
  monthlyGoal?: number;
  complete?: boolean;
};

function boundedLevel(value: unknown, fallback = 8) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(10, Math.round(number))) : fallback;
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    return Response.json({
      profile: await getAssistantProfile(auth.workspaceId),
      onboardingCompleted: auth.user.onboardingCompleted,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(request);
    const payload = await request.json() as OnboardingPayload;
    const current = await getAssistantProfile(auth.workspaceId);
    const timestamp = nowIso();
    const userName = payload.userName?.trim() || current.userName;
    const mission = payload.mission?.trim() ?? current.mission;
    if (payload.complete && (!userName || !mission)) {
      return Response.json({
        error: "Informe seu nome e a missão que a IA deverá proteger.",
      }, { status: 400 });
    }
    const db = await getDb();
    await db.update(assistantProfiles).set({
      userName,
      assistantName: payload.assistantName?.trim() || current.assistantName,
      mission,
      motivation: payload.motivation?.trim() ?? current.motivation,
      tone: ["incisivo", "direto", "equilibrado", "acolhedor"].includes(payload.tone ?? "")
        ? payload.tone!
        : current.tone,
      challengeLevel: boundedLevel(payload.challengeLevel, current.challengeLevel),
      initiativeLevel: boundedLevel(payload.initiativeLevel, current.initiativeLevel),
      adhdSupport: typeof payload.adhdSupport === "boolean" ? payload.adhdSupport : current.adhdSupport,
      focusAreas: payload.focusAreas?.trim() || current.focusAreas,
      workHours: payload.workHours?.trim() || current.workHours,
      quietHours: payload.quietHours?.trim() || current.quietHours,
      monthlyGoal: payload.monthlyGoal === undefined
        ? current.monthlyGoal
        : Math.max(0, Number(payload.monthlyGoal) || 0),
      updatedAt: timestamp,
    }).where(eq(assistantProfiles.workspaceId, auth.workspaceId)).run();
    await db.update(users).set({
      name: userName,
      ...(payload.complete ? { onboardingCompleted: true } : {}),
      updatedAt: timestamp,
    }).where(eq(users.id, auth.user.id)).run();
    return Response.json({
      ok: true,
      profile: await getAssistantProfile(auth.workspaceId),
      onboardingCompleted: payload.complete ? true : auth.user.onboardingCompleted,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
