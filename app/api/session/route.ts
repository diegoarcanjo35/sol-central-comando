import { errorResponse, getAssistantProfile, requireUser } from "../../../lib/sol";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    return Response.json({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
        isAdmin: auth.isAdmin,
        isSuperAdmin: auth.user.role === "superadmin",
        onboardingCompleted: auth.user.onboardingCompleted,
      },
      profile: await getAssistantProfile(auth.workspaceId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
