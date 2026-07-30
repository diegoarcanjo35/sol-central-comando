import { createSession, sessionCookie, setUserPassword } from "../../../../lib/auth";
import { errorResponse, requireUser } from "../../../../lib/sol";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const payload = await request.json() as { password?: string; confirmation?: string };
    if (!payload.password || payload.password !== payload.confirmation) {
      return Response.json({ error: "As senhas não conferem." }, { status: 400 });
    }
    await setUserPassword(auth.user.id, payload.password);
    const token = await createSession(auth.user.id);
    return Response.json({ ok: true }, {
      headers: { "Set-Cookie": sessionCookie(token) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
