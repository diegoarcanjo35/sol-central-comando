import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { history, projects, tasks } from "../../../db/schema";
import {
  assertAuthenticated,
  credentialStatus,
  errorResponse,
  getOrCreateConversation,
  getSettings,
  recentMessages,
} from "../../../lib/sol";

export async function GET(request: Request) {
  try {
    assertAuthenticated(request);
    const db = await getDb();
    const [projectRows, taskRows, historyRows, config, credentials, conversation] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.updatedAt)).all(),
      db.select().from(tasks).orderBy(asc(tasks.dueAt), desc(tasks.updatedAt)).all(),
      db.select().from(history).orderBy(desc(history.createdAt)).limit(60).all(),
      getSettings(),
      credentialStatus(),
      getOrCreateConversation(),
    ]);
    const chatRows = await recentMessages(conversation.id);
    return Response.json({
      projects: projectRows,
      tasks: taskRows,
      history: historyRows,
      settings: config,
      credentials,
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
