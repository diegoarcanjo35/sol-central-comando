import { clearSessionCookie, destroySession } from "../../../../lib/auth";
import { errorResponse } from "../../../../lib/sol";

export async function POST(request: Request) {
  try {
    await destroySession(request);
    return Response.json({ ok: true }, {
      headers: { "Set-Cookie": clearSessionCookie() },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
