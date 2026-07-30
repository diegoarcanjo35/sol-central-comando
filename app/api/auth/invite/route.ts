import {
  acceptInvitation,
  invitationByToken,
  sessionCookie,
} from "../../../../lib/auth";
import { errorResponse } from "../../../../lib/sol";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const resolved = await invitationByToken(token);
    if (!resolved) {
      return Response.json({
        error: "Este convite é inválido, expirou ou já foi utilizado.",
      }, { status: 404 });
    }
    return Response.json({
      invitation: {
        name: resolved.user.name,
        email: resolved.user.email,
        kind: resolved.invitation.kind,
        expiresAt: resolved.invitation.expiresAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      token?: string;
      password?: string;
      confirmation?: string;
    };
    if (!payload.token || !payload.password || payload.password !== payload.confirmation) {
      return Response.json({ error: "Confira o convite e as senhas informadas." }, { status: 400 });
    }
    const accepted = await acceptInvitation(payload.token, payload.password);
    return Response.json({
      ok: true,
      onboardingCompleted: accepted.user.onboardingCompleted,
    }, {
      headers: { "Set-Cookie": sessionCookie(accepted.sessionToken) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
