import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projects, tasks } from "../../../db/schema";
import {
  addHistory,
  errorResponse,
  invalidateContextCache,
  newId,
  normalizePriority,
  normalizeProjectStatus,
  nowIso,
  requireUser,
} from "../../../lib/sol";

type ProjectPayload = {
  id?: string;
  name?: string;
  objective?: string;
  status?: string;
  priority?: string;
  reason?: string;
  nextAction?: string;
  recurringValue?: number;
  oneTimeValue?: number;
  dueDate?: string | null;
};

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const payload = await request.json() as ProjectPayload;
    if (!payload.name?.trim()) {
      return Response.json({ error: "Informe o nome do projeto." }, { status: 400 });
    }
    const timestamp = nowIso();
    const project = {
      id: newId("prj"),
      workspaceId: auth.workspaceId,
      name: payload.name.trim(),
      objective: payload.objective?.trim() ?? "",
      status: normalizeProjectStatus(payload.status),
      priority: normalizePriority(payload.priority),
      reason: payload.reason?.trim() ?? "",
      nextAction: payload.nextAction?.trim() ?? "",
      recurringValue: Math.max(0, Number(payload.recurringValue) || 0),
      oneTimeValue: Math.max(0, Number(payload.oneTimeValue) || 0),
      dueDate: payload.dueDate || null,
      lastUpdate: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const db = await getDb();
    await db.insert(projects).values(project).run();
    await addHistory(auth.workspaceId, "criado", "projeto", project.id, `Projeto ${project.name} criado.`);
    await invalidateContextCache(auth.workspaceId);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(request);
    const payload = await request.json() as ProjectPayload;
    if (!payload.id) return Response.json({ error: "Projeto inválido." }, { status: 400 });
    const timestamp = nowIso();
    const db = await getDb();
    await db.update(projects).set({
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
      ...(payload.objective !== undefined ? { objective: payload.objective.trim() } : {}),
      ...(payload.status ? { status: normalizeProjectStatus(payload.status) } : {}),
      ...(payload.priority ? { priority: normalizePriority(payload.priority) } : {}),
      ...(payload.reason !== undefined ? { reason: payload.reason.trim() } : {}),
      ...(payload.nextAction !== undefined ? { nextAction: payload.nextAction.trim() } : {}),
      ...(payload.recurringValue !== undefined ? { recurringValue: Math.max(0, Number(payload.recurringValue) || 0) } : {}),
      ...(payload.oneTimeValue !== undefined ? { oneTimeValue: Math.max(0, Number(payload.oneTimeValue) || 0) } : {}),
      ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate || null } : {}),
      lastUpdate: timestamp,
      updatedAt: timestamp,
    }).where(and(eq(projects.workspaceId, auth.workspaceId), eq(projects.id, payload.id))).run();
    await addHistory(auth.workspaceId, "atualizado", "projeto", payload.id, "Projeto atualizado.");
    await invalidateContextCache(auth.workspaceId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Projeto inválido." }, { status: 400 });
    const db = await getDb();
    await db.update(tasks).set({ projectId: null, updatedAt: nowIso() })
      .where(and(eq(tasks.workspaceId, auth.workspaceId), eq(tasks.projectId, id))).run();
    await db.delete(projects)
      .where(and(eq(projects.workspaceId, auth.workspaceId), eq(projects.id, id))).run();
    await addHistory(auth.workspaceId, "excluido", "projeto", id, "Projeto excluído.");
    await invalidateContextCache(auth.workspaceId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
