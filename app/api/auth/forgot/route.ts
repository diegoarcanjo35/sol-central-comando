import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createInvitation,
  passwordResetIsRateLimited,
} from "../../../../lib/auth";
import { sendPasswordResetEmail } from "../../../../lib/email";
import { errorResponse } from "../../../../lib/sol";

const GENERIC_RESPONSE = {
  ok: true,
  message: "Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
};

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return Response.json({ error: "Informe seu e-mail." }, { status: 400 });
    }
    const db = await getDb();
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user || user.status === "suspended") return Response.json(GENERIC_RESPONSE);
    if (await passwordResetIsRateLimited(user.id)) {
      return Response.json({
        error: "Aguarde 15 minutos antes de solicitar outro link.",
      }, { status: 429 });
    }
    const token = await createInvitation(user.id, user.id, "reset");
    const resetUrl = `${new URL(request.url).origin}/?invite=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    return Response.json(GENERIC_RESPONSE);
  } catch (error) {
    return errorResponse(error);
  }
}
