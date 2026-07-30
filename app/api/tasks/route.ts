import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";
import {
  addHistory,
  assertAuthenticated,
  errorResponse,
  invalidateContextCache,
  newId,
  normalizePriority,
  normalizeTaskStatus,
  nowIso,
} from "../../../lib/sol";

type TaskPayload = {
  id?: string;
  projectId?: string | null;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  reason?: string;
  dueAt?: string | null;
};

export async function POST(request: Request) {
  try {
    assertAuthenticated(request);
    const payload = await request.json() as TaskPayload;
    if (!payload.title?.trim()) {
      return Response.json({ error: "Informe o título da atividade." }, { status: 400 });
    }
    const timestamp = nowIso();
    const task = {
      id: newId("tsk"),
      projectId: payload.projectId || null,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? "",
      status: normalizeTaskStatus(payload.status),
      priority: normalizePriority(payload.priority),
      reason: payload.reason?.trim() ?? "",
      dueAt: payload.dueAt || null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const db = await getDb();
    await db.insert(tasks).values(task).run();
    await addHistory("criado", "atividade", task.id, `Atividade ${task.title} criada.`);
    await invalidateContextCache();
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAuthenticated(request);
    const payload = await request.json() as TaskPayload;
    if (!payload.id) return Response.json({ error: "Atividade inválida." }, { status: 400 });
    const status = payload.status ? normalizeTaskStatus(payload.status) : undefined;
    const timestamp = nowIso();
    const db = await getDb();
    await db.update(tasks).set({
      ...(payload.title?.trim() ? { title: payload.title.trim() } : {}),
      ...(payload.projectId !== undefined ? { projectId: payload.projectId || null } : {}),
      ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
      ...(status ? { status, completedAt: status === "concluida" ? timestamp : null } : {}),
      ...(payload.priority ? { priority: normalizePriority(payload.priority) } : {}),
      ...(payload.reason !== undefined ? { reason: payload.reason.trim() } : {}),
      ...(payload.dueAt !== undefined ? { dueAt: payload.dueAt || null } : {}),
      updatedAt: timestamp,
    }).where(eq(tasks.id, payload.id)).run();
    await addHistory("atualizado", "atividade", payload.id, status === "concluida" ? "Atividade concluída." : "Atividade atualizada.");
    await invalidateContextCache();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertAuthenticated(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Atividade inválida." }, { status: 400 });
    const db = await getDb();
    await db.delete(tasks).where(eq(tasks.id, id)).run();
    await addHistory("excluido", "atividade", id, "Atividade excluída.");
    await invalidateContextCache();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
