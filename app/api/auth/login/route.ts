import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  loginIsRateLimited,
  recordLoginAttempt,
  sessionCookie,
  verifyUserPassword,
} from "../../../../lib/auth";
import { errorResponse, nowIso } from "../../../../lib/sol";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    if (!email || !password) {
      return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }
    if (await loginIsRateLimited(email)) {
      return Response.json({
        error: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
      }, { status: 429 });
    }
    const db = await getDb();
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    const valid = Boolean(user && user.status !== "suspended"
      && await verifyUserPassword(user.id, password));
    await recordLoginAttempt(email, valid);
    if (!valid || !user) {
      return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }
    const timestamp = nowIso();
    await db.update(users).set({ lastLoginAt: timestamp, updatedAt: timestamp })
      .where(eq(users.id, user.id)).run();
    const token = await createSession(user.id);
    return Response.json({ ok: true }, {
      headers: { "Set-Cookie": sessionCookie(token) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
