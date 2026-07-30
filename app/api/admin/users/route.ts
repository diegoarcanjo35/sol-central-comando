import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { usageLogs, users } from "../../../../db/schema";
import {
  createInvitedUser,
  errorResponse,
  nowIso,
  requireAdmin,
  type UserRole,
} from "../../../../lib/sol";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = await getDb();
    const [userRows, usageRows] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)).all(),
      db.select().from(usageLogs).orderBy(desc(usageLogs.createdAt)).limit(5000).all(),
    ]);
    const usageByUser = new Map<string, {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      audioBytes: number;
    }>();
    for (const row of usageRows) {
      const current = usageByUser.get(row.userId) ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        audioBytes: 0,
      };
      current.requests += 1;
      current.inputTokens += row.inputTokens;
      current.outputTokens += row.outputTokens;
      current.audioBytes += row.audioBytes;
      usageByUser.set(row.userId, current);
    }
    return Response.json({
      users: userRows.map((user) => ({
        ...user,
        usage: usageByUser.get(user.id) ?? {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          audioBytes: 0,
        },
      })),
      accessNote: "Além do cadastro no SOL, autorize o e-mail na política do Cloudflare Access.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
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
    return Response.json({ user: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
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
