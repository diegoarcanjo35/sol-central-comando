import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { costSettings, modelPricing, usageLogs, users } from "../../../../db/schema";
import { estimateUsageUsd, pricingKey } from "../../../../lib/costs";
import {
  createInvitedUser,
  errorResponse,
  nowIso,
  requirePlatformOwner,
  type UserRole,
} from "../../../../lib/sol";
import { createInvitation, hasPassword } from "../../../../lib/auth";

export async function GET(request: Request) {
  try {
    await requirePlatformOwner(request);
    const db = await getDb();
    const [userRows, usageRows, costConfig, pricingRows] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)).all(),
      db.select().from(usageLogs).orderBy(desc(usageLogs.createdAt)).limit(5000).all(),
      db.select().from(costSettings).where(eq(costSettings.id, 1)).get(),
      db.select().from(modelPricing).all(),
    ]);
    const usdToBrl = costConfig?.usdToBrl ?? 5.5;
    const monthKey = nowIso().slice(0, 7);
    const prices = new Map(pricingRows.map((price) => [pricingKey(price.provider, price.model), price]));
    const usageByUser = new Map<string, {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      audioBytes: number;
      audioDurationSeconds: number;
      estimatedCostBrl: number;
      unpricedRequests: number;
    }>();
    for (const row of usageRows.filter((item) => item.createdAt.startsWith(monthKey))) {
      const current = usageByUser.get(row.userId) ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        audioBytes: 0,
        audioDurationSeconds: 0,
        estimatedCostBrl: 0,
        unpricedRequests: 0,
      };
      current.requests += 1;
      current.inputTokens += row.inputTokens;
      current.outputTokens += row.outputTokens;
      current.audioBytes += row.audioBytes;
      current.audioDurationSeconds += row.audioDurationSeconds;
      const price = prices.get(pricingKey(row.provider, row.model));
      const usd = estimateUsageUsd(row, price);
      if (usd === null || (
        row.operation === "assistant"
        && price
        && price.inputUsdPerMillion === 0
        && price.outputUsdPerMillion === 0
      ) || (
        row.operation === "transcription"
        && price
        && (price.audioUsdPerMinute === 0 || row.audioDurationSeconds <= 0)
      )) {
        current.unpricedRequests += 1;
      } else {
        current.estimatedCostBrl += usd * usdToBrl;
      }
      usageByUser.set(row.userId, current);
    }
    return Response.json({
      users: await Promise.all(userRows.map(async (user) => ({
        ...user,
        hasPassword: await hasPassword(user.id),
        usage: usageByUser.get(user.id) ?? {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          audioBytes: 0,
          audioDurationSeconds: 0,
          estimatedCostBrl: 0,
          unpricedRequests: 0,
        },
      }))),
      usagePeriod: monthKey,
      usdToBrl,
      accessNote: "Gere o link e envie diretamente à pessoa. Ele expira em 48 horas.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformOwner(request);
    const payload = await request.json() as {
      email?: string;
      name?: string;
      role?: UserRole;
      plan?: string;
    };
    const created = await createInvitedUser({
      email: payload.email ?? "",
      name: payload.name ?? "",
      role: payload.role,
      plan: payload.plan,
    });
    const token = await createInvitation(
      created.id,
      auth.user.id,
      created.existing ? "reset" : "invite",
    );
    return Response.json({
      user: created,
      inviteUrl: `${new URL(request.url).origin}/?invite=${encodeURIComponent(token)}`,
      expiresInHours: 48,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePlatformOwner(request);
    const payload = await request.json() as {
      id?: string;
      status?: "active" | "invited" | "suspended";
      role?: "admin" | "member";
      plan?: string;
    };
    if (!payload.id) return Response.json({ error: "Usuário inválido." }, { status: 400 });
    if (payload.id === auth.user.id && payload.status === "suspended") {
      return Response.json({ error: "Você não pode suspender seu próprio acesso." }, { status: 400 });
    }
    const db = await getDb();
    const target = await db.select().from(users).where(eq(users.id, payload.id)).get();
    if (!target) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (target.role === "superadmin") {
      return Response.json({
        error: "A conta proprietária não pode ser alterada por este painel.",
      }, { status: 400 });
    }
    await db.update(users).set({
      ...(payload.status && ["active", "invited", "suspended"].includes(payload.status)
        ? { status: payload.status }
        : {}),
      ...(payload.role && ["admin", "member"].includes(payload.role)
        ? { role: payload.role }
        : {}),
      ...(typeof payload.plan === "string" ? { plan: payload.plan.trim() || "beta" } : {}),
      updatedAt: nowIso(),
    }).where(eq(users.id, payload.id)).run();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
