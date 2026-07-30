import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { history, projects, tasks } from "../../../db/schema";
import {
  credentialStatus,
  errorResponse,
  getOrCreateConversation,
  getSettings,
  recentMessages,
  requireUser,
} from "../../../lib/sol";
import { hasPassword } from "../../../lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    const db = await getDb();
    const [projectRows, taskRows, historyRows, config, credentials, conversation] = await Promise.all([
      db.select().from(projects).where(eq(projects.workspaceId, auth.workspaceId)).orderBy(desc(projects.updatedAt)).all(),
      db.select().from(tasks).where(eq(tasks.workspaceId, auth.workspaceId)).orderBy(asc(tasks.dueAt), desc(tasks.updatedAt)).all(),
      db.select().from(history).where(eq(history.workspaceId, auth.workspaceId)).orderBy(desc(history.createdAt)).limit(60).all(),
      getSettings(auth.workspaceId),
      auth.user.role === "superadmin" ? credentialStatus() : Promise.resolve(null),
      getOrCreateConversation(auth.workspaceId),
    ]);
    const chatRows = await recentMessages(auth.workspaceId, conversation.id);
    return Response.json({
      projects: projectRows,
      tasks: taskRows,
      history: historyRows,
      settings: config,
      credentials,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
        isAdmin: auth.isAdmin,
        isSuperAdmin: auth.user.role === "superadmin",
        onboardingCompleted: auth.user.onboardingCompleted,
        hasPassword: await hasPassword(auth.user.id),
      },
      conversation: {
        id: conversation.id,
        greetedToday: Boolean(conversation.greetedAt),
        messages: chatRows,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
