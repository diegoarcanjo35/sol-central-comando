"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Tab = "inicio" | "atividades" | "projetos" | "historico" | "ajustes" | "admin";
type Provider = "openai" | "google" | "anthropic";
type Project = {
  id: string;
  name: string;
  objective: string;
  status: string;
  priority: string;
  reason: string;
  nextAction: string;
  recurringValue: number;
  oneTimeValue: number;
  dueDate: string | null;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
};
type Task = {
  id: string;
  projectId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  reason: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type HistoryItem = {
  id: string;
  summary: string;
  detail: string;
  createdAt: string;
  entityType: string;
};
type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  provider?: string | null;
};
type Settings = {
  activeProvider: Provider;
  openaiModel: string;
  googleModel: string;
  anthropicModel: string;
  userName: string;
  mission: string;
  monthlyGoal: number;
  assistantName: string;
  motivation: string;
  tone: string;
  challengeLevel: number;
  initiativeLevel: number;
  adhdSupport: boolean;
  focusAreas: string;
  workHours: string;
  quietHours: string;
};
type CredentialStatus = Record<Provider, { configured: boolean; updatedAt: string | null }>;
type DashboardData = {
  projects: Project[];
  tasks: Task[];
  history: HistoryItem[];
  settings: Settings;
  credentials: CredentialStatus | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    onboardingCompleted: boolean;
    hasPassword: boolean;
  };
  conversation: {
    id: string;
    greetedToday: boolean;
    messages: ChatMessage[];
  };
};

const nav: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Início", icon: "⌂" },
  { id: "atividades", label: "Atividades", icon: "✓" },
  { id: "projetos", label: "Projetos", icon: "▦" },
  { id: "historico", label: "Histórico", icon: "↺" },
  { id: "ajustes", label: "Ajustes", icon: "⚙" },
  { id: "admin", label: "Admin", icon: "◆" },
];

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  anthropic: "Anthropic Claude",
};

const emptyCredentials: CredentialStatus = {
  openai: { configured: false, updatedAt: null },
  google: { configured: false, updatedAt: null },
  anthropic: { configured: false, updatedAt: null },
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [inviteToken] = useState(() => typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("invite") ?? "");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [taskModal, setTaskModal] = useState<Task | "new" | null>(null);
  const [projectModal, setProjectModal] = useState<Project | "new" | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const loadDashboard = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = await response.json() as DashboardData & { error?: string; code?: string };
      if (!response.ok) {
        if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          setData(null);
          return;
        }
        throw new Error(payload.error ?? "Não foi possível carregar o painel.");
      }
      setAuthRequired(false);
      setData(payload);
      setChat(payload.conversation.messages ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const settings = data?.settings;
  const credentials = data?.credentials ?? emptyCredentials;
  const visibleNav = nav.filter((item) => item.id !== "admin" || data?.user.isAdmin);
  const openTasks = tasks.filter((task) => task.status !== "concluida");
  const now = new Date();
  const overdue = openTasks.filter((task) => task.dueAt && new Date(task.dueAt) < now);
  const today = openTasks.filter((task) => task.dueAt && isToday(task.dueAt));
  const staleProjects = projects.filter((project) => daysSince(project.updatedAt) >= 7);
  const recurringValue = projects.reduce((total, project) => total + Number(project.recurringValue || 0), 0);

  const projectMap = Object.fromEntries(projects.map((project) => [project.id, project.name]));

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir.");
    return payload;
  }

  async function toggleTask(task: Task) {
    try {
      await request("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: task.id,
          status: task.status === "concluida" ? "pendente" : "concluida",
        }),
      });
      await loadDashboard(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Erro ao atualizar.");
    }
  }

  async function sendMessage(text = message) {
    const clean = text.trim();
    if (!clean || assistantBusy) return;
    setMessage("");
    setAssistantBusy(true);
    setChat((current) => [...current, { role: "user", content: clean }]);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const payload = await response.json() as { reply?: string; error?: string; applied?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "A SOL não conseguiu responder.");
      setChat((current) => [...current, { role: "assistant", content: payload.reply ?? "Registrado." }]);
      await loadDashboard(true);
    } catch (assistantError) {
      setChat((current) => [...current, {
        role: "assistant",
        content: assistantError instanceof Error ? assistantError.message : "Não consegui responder agora.",
      }]);
    } finally {
      setAssistantBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setChat((current) => [...current, {
        role: "assistant",
        content: "Este navegador não oferece gravação segura. Use o microfone do teclado para ditar.",
      }]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setChat((current) => [...current, {
        role: "assistant",
        content: "O microfone não foi liberado. Você pode continuar digitando ou usar o microfone do teclado.",
      }]);
    }
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.set("audio", new File([blob], "gravacao.webm", { type: blob.type || "audio/webm" }));
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível transcrever.");
      setMessage(payload.text ?? "");
    } catch (transcriptionError) {
      setChat((current) => [...current, {
        role: "assistant",
        content: transcriptionError instanceof Error ? transcriptionError.message : "Erro na transcrição.",
      }]);
    } finally {
      setTranscribing(false);
    }
  }

  async function changeProvider(provider: Provider) {
    try {
      await request("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ activeProvider: provider }),
      });
      await loadDashboard(true);
    } catch (providerError) {
      setError(providerError instanceof Error ? providerError.message : "Erro ao trocar a IA.");
    }
  }

  if (inviteToken) return <InviteScreen token={inviteToken} />;
  if (loading) return <LoadingScreen />;
  if (authRequired || !data) {
    return <LoginScreen onLogin={async () => { setAuthRequired(false); await loadDashboard(); }} error={error} />;
  }
  if (data && !data.user.onboardingCompleted) {
    return <OnboardingScreen userName={data.user.name} onComplete={() => loadDashboard()} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          {visibleNav.map((item) => (
            <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="mission"><small>SEU NORTE</small><p>{settings?.mission}</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-logo"><Brand /></div>
          <div>
            <p className="eyebrow">{dateLabel()}</p>
            <h1>{tab === "inicio" ? greetingTitle(settings?.userName ?? "Diego") : nav.find((item) => item.id === tab)?.label}</h1>
          </div>
          <button className="avatar" onClick={() => setTab("ajustes")}>{initials(data?.user.name ?? "SOL")}</button>
        </header>

        {error && <button className="error-banner" onClick={() => setError("")}>{error}<span>×</span></button>}

        {tab === "inicio" && (
          <div className="page">
            <section className="focus">
              <div>
                <p className="eyebrow light">FOCO AGORA</p>
                <h2>{focusTitle(overdue, openTasks)}</h2>
                <p>{focusText(overdue, openTasks, settings?.mission ?? "")}</p>
              </div>
              <button onClick={() => setTab("atividades")}>Executar agora →</button>
            </section>
            <section className="metrics">
              <Metric value={overdue.length} label="Atrasadas" detail="Não carregue isso para amanhã" tone="danger" />
              <Metric value={today.length} label="Para hoje" detail="Proteja sua prioridade" tone="blue" />
              <Metric value={staleProjects.length} label="Sem atualização" detail="Há 7 dias ou mais" tone="amber" />
              <Metric value={formatMoney(recurringValue)} label="Recorrência" detail={`Meta: ${formatMoney(settings?.monthlyGoal ?? 0)}`} tone="green" />
            </section>
            <section className="dashboard-grid">
              <div className="panel">
                <PanelTitle eyebrow="PRÓXIMAS AÇÕES" title="Hoje não termina sem isso" />
                {openTasks.length
                  ? <TaskList tasks={prioritizeTasks(openTasks).slice(0, 4)} projectMap={projectMap} onToggle={toggleTask} onEdit={setTaskModal} />
                  : <Empty text="Nenhuma atividade pendente. Crie a próxima ação." />}
              </div>
              <div className="panel radar">
                <PanelTitle eyebrow="RADAR" title="Projetos que exigem atenção" />
                {projects.length ? projects.slice().sort((a, b) => daysSince(b.updatedAt) - daysSince(a.updatedAt)).slice(0, 5).map((project) => (
                  <button className="project-row" key={project.id} onClick={() => setProjectModal(project)}>
                    <span className={`project-dot ${project.priority}`}>{project.name[0]}</span>
                    <span><strong>{project.name}</strong><small>{statusLabel(project.status)}</small></span>
                    <b>{daysSince(project.updatedAt)}d</b>
                  </button>
                )) : <Empty text="Cadastre o primeiro projeto." />}
              </div>
            </section>
          </div>
        )}

        {tab === "atividades" && (
          <div className="page">
            <Heading eyebrow="EXECUÇÃO" title="Todas as atividades" action="＋ Nova atividade" onAction={() => setTaskModal("new")} />
            <div className="filters">
              <span>{openTasks.length} abertas</span>
              <span>{overdue.length} atrasadas</span>
              <span>{tasks.filter((task) => task.status === "concluida").length} concluídas</span>
            </div>
            <div className="panel">
              {tasks.length
                ? <TaskList tasks={prioritizeTasks(tasks)} projectMap={projectMap} onToggle={toggleTask} onEdit={setTaskModal} expanded />
                : <Empty text="Ainda não há atividades. Crie uma próxima ação objetiva." />}
            </div>
          </div>
        )}

        {tab === "projetos" && (
          <div className="page">
            <Heading eyebrow="VISÃO GERAL" title="Projetos ativos" action="＋ Novo projeto" onAction={() => setProjectModal("new")} />
            <div className="project-grid">
              {projects.map((project) => (
                <button className="project-card" key={project.id} onClick={() => setProjectModal(project)}>
                  <div>
                    <span className={`project-dot large ${project.priority}`}>{project.name[0]}</span>
                    {project.recurringValue > 0 && <em>{formatMoney(project.recurringValue)}/mês</em>}
                  </div>
                  <h3>{project.name}</h3>
                  <p>{project.nextAction || project.objective || "Defina a próxima ação."}</p>
                  <footer><span>{statusLabel(project.status)}</span><strong>há {daysSince(project.updatedAt)} dias</strong></footer>
                </button>
              ))}
              {!projects.length && <Empty text="Cadastre seus projetos e pare de depender da memória." />}
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div className="page narrow">
            <Heading eyebrow="MEMÓRIA" title="Histórico de decisões" />
            <div className="timeline">
              {(data?.history ?? []).map((item) => (
                <Timeline key={item.id} time={dateTime(item.createdAt)} title={item.summary} text={item.detail} />
              ))}
              {!data?.history.length && <Empty text="As alterações aparecerão aqui automaticamente." />}
            </div>
          </div>
        )}

        {tab === "ajustes" && settings && (
          <SettingsPanel
            settings={settings}
            credentials={credentials}
            onProvider={changeProvider}
            onReload={() => loadDashboard(true)}
            onError={setError}
            isAdmin={Boolean(data?.user.isSuperAdmin)}
            hasPassword={Boolean(data?.user.hasPassword)}
          />
        )}

        {tab === "admin" && data?.user.isAdmin && (
          <AdminPanel onError={setError} />
        )}
      </section>

      <button className="voice" onClick={() => setAssistantOpen(true)} aria-label="Abrir conversa com a SOL">
        <span>✦</span><small>SOL</small>
      </button>
      <nav className="mobile-nav">
        {visibleNav.filter((item) => item.id !== "ajustes").map((item) => (
          <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>

      {assistantOpen && (
        <div className="backdrop" onClick={() => setAssistantOpen(false)}>
          <section className="assistant" onClick={(event) => event.stopPropagation()}>
            <div className="handle" />
            <header>
              <div><span className="sol">{(settings?.assistantName ?? "SOL")[0]}</span><p><strong>{settings?.assistantName ?? "SOL"}</strong><small>{providerLabels[settings?.activeProvider ?? "openai"]} · memória privada</small></p></div>
              <button onClick={() => setAssistantOpen(false)} aria-label="Fechar conversa">×</button>
            </header>
            <div className="assistant-scroll">
              {!chat.length && (
                <div className="assistant-message">
                  {data?.conversation.greetedToday ? "Vamos direto ao ponto. O que precisa ser resolvido agora?" : `Fala, ${settings?.userName ?? "você"}. O que vamos resolver agora?`}
                </div>
              )}
              {chat.map((item, index) => (
                <div className={item.role === "user" ? "user-message" : "assistant-message firm"} key={`${item.role}-${index}`}>
                  {item.content}
                </div>
              ))}
              {assistantBusy && <div className="assistant-message typing">Analisando prioridades e contexto…</div>}
            </div>
            {recording && <div className="recording-status"><i />Gravando. Toque novamente para finalizar.</div>}
            {transcribing && <div className="recording-status">Transcrevendo o áudio…</div>}
            <footer>
              <button className={recording ? "mic active" : "mic"} onClick={toggleRecording} disabled={transcribing} aria-label={recording ? "Parar gravação" : "Gravar áudio"}>
                {recording ? "■" : "●"}
              </button>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Digite ou grave uma mensagem…"
              />
              <button onClick={() => void sendMessage()} disabled={assistantBusy} aria-label="Enviar mensagem">↑</button>
            </footer>
          </section>
        </div>
      )}

      {taskModal && (
        <TaskDialog
          task={taskModal}
          projects={projects}
          onClose={() => setTaskModal(null)}
          onSaved={async () => { setTaskModal(null); await loadDashboard(true); }}
          onError={setError}
        />
      )}
      {projectModal && (
        <ProjectDialog
          project={projectModal}
          onClose={() => setProjectModal(null)}
          onSaved={async () => { setProjectModal(null); await loadDashboard(true); }}
          onError={setError}
        />
      )}
    </main>
  );
}

function TaskDialog({ task, projects, onClose, onSaved, onError }: {
  task: Task | "new";
  projects: Project[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const existing = task === "new" ? null : task;
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(existing ? { id: existing.id } : {}),
      title: String(form.get("title") ?? ""),
      projectId: String(form.get("projectId") ?? "") || null,
      priority: String(form.get("priority") ?? "media"),
      status: String(form.get("status") ?? "pendente"),
      dueAt: localDateToIso(String(form.get("dueAt") ?? "")),
      reason: String(form.get("reason") ?? ""),
      description: String(form.get("description") ?? ""),
    };
    try {
      const response = await fetch("/api/tasks", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Erro ao salvar.");
      await onSaved();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!existing || !confirm("Excluir esta atividade?")) return;
    const response = await fetch(`/api/tasks?id=${encodeURIComponent(existing.id)}`, { method: "DELETE" });
    if (response.ok) await onSaved();
  }
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">ATIVIDADE</p><h2>{existing ? "Editar atividade" : "Nova atividade"}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <label>Título<input name="title" defaultValue={existing?.title} required autoFocus /></label>
        <div className="form-grid">
          <label>Projeto<select name="projectId" defaultValue={existing?.projectId ?? ""}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Prazo<input type="datetime-local" name="dueAt" defaultValue={isoToLocalDate(existing?.dueAt)} /></label>
          <label>Prioridade<select name="priority" defaultValue={existing?.priority ?? "media"}><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></label>
          <label>Status<select name="status" defaultValue={existing?.status ?? "pendente"}><option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option><option value="aguardando">Aguardando</option><option value="concluida">Concluída</option></select></label>
        </div>
        <label>Por que isso importa?<textarea name="reason" defaultValue={existing?.reason} /></label>
        <label>Observações<textarea name="description" defaultValue={existing?.description} /></label>
        <footer>{existing && <button className="danger-button" type="button" onClick={remove}>Excluir</button>}<span /><button className="primary-button" disabled={busy}>{busy ? "Salvando…" : "Salvar atividade"}</button></footer>
      </form>
    </div>
  );
}

function ProjectDialog({ project, onClose, onSaved, onError }: {
  project: Project | "new";
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const existing = project === "new" ? null : project;
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(existing ? { id: existing.id } : {}),
      name: String(form.get("name") ?? ""),
      objective: String(form.get("objective") ?? ""),
      nextAction: String(form.get("nextAction") ?? ""),
      reason: String(form.get("reason") ?? ""),
      status: String(form.get("status") ?? "planejamento"),
      priority: String(form.get("priority") ?? "media"),
      recurringValue: Number(form.get("recurringValue") ?? 0),
      oneTimeValue: Number(form.get("oneTimeValue") ?? 0),
      dueDate: localDateToIso(String(form.get("dueDate") ?? "")),
    };
    try {
      const response = await fetch("/api/projects", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Erro ao salvar.");
      await onSaved();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!existing || !confirm("Excluir este projeto? As atividades ficarão sem projeto.")) return;
    const response = await fetch(`/api/projects?id=${encodeURIComponent(existing.id)}`, { method: "DELETE" });
    if (response.ok) await onSaved();
  }
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">PROJETO</p><h2>{existing ? "Editar projeto" : "Novo projeto"}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <label>Nome<input name="name" defaultValue={existing?.name} required autoFocus /></label>
        <label>Objetivo<textarea name="objective" defaultValue={existing?.objective} /></label>
        <label>Por que começamos isso?<textarea name="reason" defaultValue={existing?.reason} /></label>
        <label>Próxima ação<input name="nextAction" defaultValue={existing?.nextAction} /></label>
        <div className="form-grid">
          <label>Status<select name="status" defaultValue={existing?.status ?? "planejamento"}><option value="planejamento">Planejamento</option><option value="negociacao">Negociação</option><option value="ativo">Ativo</option><option value="aguardando">Aguardando</option><option value="pausado">Pausado</option><option value="concluido">Concluído</option></select></label>
          <label>Prioridade<select name="priority" defaultValue={existing?.priority ?? "media"}><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></label>
          <label>Receita recorrente<input name="recurringValue" type="number" min="0" step="0.01" defaultValue={existing?.recurringValue ?? 0} /></label>
          <label>Receita pontual<input name="oneTimeValue" type="number" min="0" step="0.01" defaultValue={existing?.oneTimeValue ?? 0} /></label>
          <label>Prazo<input name="dueDate" type="date" defaultValue={isoToLocalDate(existing?.dueDate).slice(0, 10)} /></label>
        </div>
        <footer>{existing && <button className="danger-button" type="button" onClick={remove}>Excluir</button>}<span /><button className="primary-button" disabled={busy}>{busy ? "Salvando…" : "Salvar projeto"}</button></footer>
      </form>
    </div>
  );
}

function SettingsPanel({ settings, credentials, onProvider, onReload, onError, isAdmin, hasPassword }: {
  settings: Settings;
  credentials: CredentialStatus;
  onProvider: (provider: Provider) => Promise<void>;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
  isAdmin: boolean;
  hasPassword: boolean;
}) {
  const [keys, setKeys] = useState<Record<Provider, string>>({ openai: "", google: "", anthropic: "" });
  const [busy, setBusy] = useState("");
  async function saveKey(provider: Provider) {
    if (!keys[provider].trim()) return;
    setBusy(provider);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: keys[provider] }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao salvar a chave.");
      setKeys((current) => ({ ...current, [provider]: "" }));
      await onReload();
    } catch (keyError) {
      onError(keyError instanceof Error ? keyError.message : "Erro ao salvar a chave.");
    } finally {
      setBusy("");
    }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.get("userName"),
          monthlyGoal: form.get("monthlyGoal"),
          mission: form.get("mission"),
          motivation: form.get("motivation"),
          assistantName: form.get("assistantName"),
          tone: form.get("tone"),
          challengeLevel: form.get("challengeLevel"),
          initiativeLevel: form.get("initiativeLevel"),
          adhdSupport: form.get("adhdSupport") === "on",
          focusAreas: form.get("focusAreas"),
          workHours: form.get("workHours"),
          quietHours: form.get("quietHours"),
          complete: true,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao salvar.");
      await onReload();
    } catch (profileError) {
      onError(profileError instanceof Error ? profileError.message : "Erro ao salvar.");
    } finally {
      setBusy("");
    }
  }
  async function saveModels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("models");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiModel: form.get("openaiModel"),
          googleModel: form.get("googleModel"),
          anthropicModel: form.get("anthropicModel"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao salvar os modelos.");
      await onReload();
    } catch (modelError) {
      onError(modelError instanceof Error ? modelError.message : "Erro ao salvar os modelos.");
    } finally {
      setBusy("");
    }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("password");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: form.get("password"),
          confirmation: form.get("confirmation"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao definir a senha.");
      formElement.reset();
      await onReload();
    } catch (passwordError) {
      onError(passwordError instanceof Error ? passwordError.message : "Erro ao definir a senha.");
    } finally {
      setBusy("");
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }
  return (
    <div className="page narrow">
      <Heading eyebrow="PERSONALIZAÇÃO" title="Sua IA e sua direção" />
      {isAdmin && (
        <div className="panel settings">
          <PanelTitle eyebrow="CONTROLE GLOBAL" title="Provedores de IA" />
          <label>IA ativa para todos os usuários</label>
          <div className="providers">
            {(Object.keys(providerLabels) as Provider[]).map((provider) => (
              <button className={settings.activeProvider === provider ? "active" : ""} onClick={() => void onProvider(provider)} key={provider}>
                <span>{providerLabels[provider][0]}</span><div>{providerLabels[provider]}<small>{credentials[provider].configured ? "Configurada" : "Sem chave"}</small></div>
              </button>
            ))}
          </div>
          {(Object.keys(providerLabels) as Provider[]).map((provider) => (
            <div className="api-row" key={provider}>
              <div><strong>{providerLabels[provider]}</strong><small>{credentials[provider].configured ? "Chave protegida no servidor" : "Não configurada"}</small></div>
              <input type="password" value={keys[provider]} onChange={(event) => setKeys((current) => ({ ...current, [provider]: event.target.value }))} placeholder={credentials[provider].configured ? "Digite para substituir" : "Cole a chave de API"} />
              <button onClick={() => void saveKey(provider)} disabled={!keys[provider] || busy === provider}>{busy === provider ? "Salvando…" : "Salvar"}</button>
            </div>
          ))}
          <div className="security"><span>◈</span><p><strong>Somente administradores controlam as APIs.</strong><br />As chaves ficam criptografadas no servidor e nunca são entregues ao navegador dos usuários.</p></div>
          <form className="model-form" onSubmit={saveModels}>
            <div className="form-grid">
              <label>Modelo OpenAI<input name="openaiModel" defaultValue={settings.openaiModel} /></label>
              <label>Modelo Gemini<input name="googleModel" defaultValue={settings.googleModel} /></label>
              <label>Modelo Claude<input name="anthropicModel" defaultValue={settings.anthropicModel} /></label>
            </div>
            <button className="primary-button" disabled={busy === "models"}>{busy === "models" ? "Salvando…" : "Salvar modelos"}</button>
          </form>
        </div>
      )}
      <form className="panel settings profile-settings" onSubmit={saveProfile}>
        <PanelTitle eyebrow="COMPORTAMENTO" title="Como a IA deve trabalhar com você" />
        <div className="form-grid">
          <label>Seu nome<input name="userName" defaultValue={settings.userName} /></label>
          <label>Nome da sua IA<input name="assistantName" defaultValue={settings.assistantName} /></label>
          <label>Meta mensal<input name="monthlyGoal" type="number" min="0" step="100" defaultValue={settings.monthlyGoal} /></label>
          <label>Tom<select name="tone" defaultValue={settings.tone}><option value="incisivo">Incisivo</option><option value="direto">Direto</option><option value="equilibrado">Equilibrado</option><option value="acolhedor">Acolhedor</option></select></label>
          <label>Cobrança: {settings.challengeLevel}/10<input name="challengeLevel" type="range" min="1" max="10" defaultValue={settings.challengeLevel} /></label>
          <label>Iniciativa: {settings.initiativeLevel}/10<input name="initiativeLevel" type="range" min="1" max="10" defaultValue={settings.initiativeLevel} /></label>
          <label>Horário de trabalho<input name="workHours" defaultValue={settings.workHours} placeholder="08:00-18:00" /></label>
          <label>Horário silencioso<input name="quietHours" defaultValue={settings.quietHours} placeholder="22:00-07:00" /></label>
        </div>
        <label>O que você quer transformar?<textarea name="mission" defaultValue={settings.mission} /></label>
        <label>Por que isso não pode ser abandonado?<textarea name="motivation" defaultValue={settings.motivation} /></label>
        <label>Áreas que devem dominar sua agenda<input name="focusAreas" defaultValue={settings.focusAreas} /></label>
        <label className="check-row"><input name="adhdSupport" type="checkbox" defaultChecked={settings.adhdSupport} /> Ativar apoio contra dispersão e esquecimento</label>
        <button className="primary-button" disabled={busy === "profile"}>{busy === "profile" ? "Salvando…" : "Salvar personalidade"}</button>
      </form>
      <form className="panel settings profile-settings" onSubmit={savePassword}>
        <PanelTitle eyebrow="ACESSO" title={hasPassword ? "Alterar senha" : "Defina sua senha antes de liberar o aplicativo"} />
        {!hasPassword && <div className="security"><span>!</span><p><strong>Etapa obrigatória para a publicação.</strong><br />Só retire a restrição da Cloudflare depois que esta senha estiver salva.</p></div>}
        <div className="form-grid">
          <label>Nova senha<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
          <label>Confirmar senha<input name="confirmation" type="password" minLength={10} required autoComplete="new-password" /></label>
        </div>
        <button className="primary-button" disabled={busy === "password"}>{busy === "password" ? "Salvando…" : hasPassword ? "Alterar senha" : "Criar minha senha"}</button>
      </form>
      <button className="logout-button" onClick={() => void logout()}>Sair da conta</button>
    </div>
  );
}

function LoginScreen({ onLogin, error: initialError }: { onLogin: () => Promise<void>; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível entrar.");
      await onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <p className="eyebrow">ACESSO SEGURO</p>
        <h1>Entre no seu comando.</h1>
        <p>Cada conta possui projetos, memória e conversas completamente separados.</p>
        {error && <div className="inline-error">{error}</div>}
        <label>E-mail<input name="email" type="email" required autoComplete="email" autoFocus /></label>
        <label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="primary-button" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        <small>Primeiro acesso? Use o link enviado pelo administrador.</small>
      </form>
    </main>
  );
}

function InviteScreen({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<{ name: string; email: string; kind: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as {
          invitation?: { name: string; email: string; kind: string };
          error?: string;
        };
        if (!response.ok || !payload.invitation) throw new Error(payload.error ?? "Convite inválido.");
        setInvitation(payload.invitation);
      })
      .catch((inviteError) => setError(inviteError instanceof Error ? inviteError.message : "Convite inválido."))
      .finally(() => setLoading(false));
  }, [token]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: form.get("password"),
          confirmation: form.get("confirmation"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível ativar o acesso.");
      window.location.assign("/");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Não foi possível ativar o acesso.");
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <p className="eyebrow">{invitation?.kind === "reset" ? "REDEFINIR ACESSO" : "CONVITE SOL"}</p>
        <h1>{loading ? "Validando convite…" : invitation ? `Olá, ${invitation.name}.` : "Convite indisponível"}</h1>
        {invitation && <p>Crie sua senha para acessar o workspace privado vinculado a <strong>{invitation.email}</strong>.</p>}
        {error && <div className="inline-error">{error}</div>}
        {invitation && (
          <>
            <label>Senha<input name="password" type="password" minLength={10} required autoComplete="new-password" autoFocus /></label>
            <label>Confirmar senha<input name="confirmation" type="password" minLength={10} required autoComplete="new-password" /></label>
            <small>Use ao menos 10 caracteres, com letras e números.</small>
            <button className="primary-button" disabled={busy}>{busy ? "Ativando…" : invitation.kind === "reset" ? "Salvar nova senha" : "Criar conta e continuar"}</button>
          </>
        )}
        {!loading && !invitation && <button type="button" className="text-button" onClick={() => window.location.assign("/")}>Voltar ao login</button>}
      </form>
    </main>
  );
}

function OnboardingScreen({ userName, onComplete }: { userName: string; onComplete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.get("userName"),
          assistantName: form.get("assistantName"),
          mission: form.get("mission"),
          motivation: form.get("motivation"),
          tone: form.get("tone"),
          challengeLevel: form.get("challengeLevel"),
          initiativeLevel: form.get("initiativeLevel"),
          adhdSupport: form.get("adhdSupport") === "on",
          focusAreas: form.get("focusAreas"),
          monthlyGoal: form.get("monthlyGoal"),
          workHours: form.get("workHours"),
          quietHours: form.get("quietHours"),
          complete: true,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir.");
      await onComplete();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding-shell">
      <form className="onboarding-card" onSubmit={submit}>
        <Brand />
        <p className="eyebrow">BEM-VINDO AO SOL</p>
        <h1>Vamos construir uma IA que não deixa você se abandonar.</h1>
        <p className="onboarding-copy">Suas respostas ficam no seu espaço privado e definem como a IA vai orientar, cobrar e priorizar.</p>
        {error && <div className="inline-error">{error}</div>}
        <div className="form-grid">
          <label>Como devemos chamar você?<input name="userName" defaultValue={userName} required /></label>
          <label>Nome da sua IA<input name="assistantName" defaultValue="SOL" required /></label>
          <label>Tom principal<select name="tone" defaultValue="direto"><option value="incisivo">Incisivo</option><option value="direto">Direto</option><option value="equilibrado">Equilibrado</option><option value="acolhedor">Acolhedor</option></select></label>
          <label>Meta mensal<input name="monthlyGoal" type="number" min="0" step="100" defaultValue="0" /></label>
          <label>Nível de cobrança<input name="challengeLevel" type="range" min="1" max="10" defaultValue="8" /></label>
          <label>Nível de iniciativa<input name="initiativeLevel" type="range" min="1" max="10" defaultValue="8" /></label>
        </div>
        <label>O que você quer transformar?<textarea name="mission" required placeholder="Ex.: construir receita recorrente e dar segurança à minha família." /></label>
        <label>Por que isso não pode ser abandonado?<textarea name="motivation" placeholder="A razão que a IA deve lembrar quando você quiser desistir." /></label>
        <label>Áreas de foco<input name="focusAreas" defaultValue="receita recorrente, automação, família" /></label>
        <div className="form-grid">
          <label>Horário de trabalho<input name="workHours" defaultValue="08:00-18:00" /></label>
          <label>Horário silencioso<input name="quietHours" defaultValue="22:00-07:00" /></label>
        </div>
        <label className="check-row"><input name="adhdSupport" type="checkbox" defaultChecked /> Ativar apoio contra dispersão, excesso de escolhas e tarefas esquecidas</label>
        <button className="primary-button" disabled={busy}>{busy ? "Preparando seu espaço…" : "Entrar no meu painel"}</button>
      </form>
    </main>
  );
}

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  plan: string;
  onboardingCompleted: boolean;
  lastLoginAt: string | null;
  hasPassword: boolean;
  usage: { requests: number; inputTokens: number; outputTokens: number; audioBytes: number };
};

function AdminPanel({ onError }: { onError: (message: string) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState("");
  const [accessNote, setAccessNote] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  async function load() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = await response.json() as { users?: AdminUser[]; accessNote?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Erro ao carregar usuários.");
    setUsers(payload.users ?? []);
    setAccessNote(payload.accessNote ?? "");
  }
  useEffect(() => {
    void fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { users?: AdminUser[]; accessNote?: string; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Erro ao carregar usuários.");
        setUsers(payload.users ?? []);
        setAccessNote(payload.accessNote ?? "");
      })
      .catch((loadError) => onError(loadError instanceof Error ? loadError.message : "Erro ao carregar usuários."));
  }, [onError]);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("invite");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          role: form.get("role"),
          plan: form.get("plan"),
        }),
      });
      const payload = await response.json() as { error?: string; inviteUrl?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao cadastrar usuário.");
      setInviteUrl(payload.inviteUrl ?? "");
      formElement.reset();
      await load();
    } catch (inviteError) {
      onError(inviteError instanceof Error ? inviteError.message : "Erro ao cadastrar usuário.");
    } finally {
      setBusy("");
    }
  }
  async function generateAccess(user: AdminUser) {
    setBusy(`invite-${user.id}`);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: "member",
          plan: user.plan,
        }),
      });
      const payload = await response.json() as { error?: string; inviteUrl?: string };
      if (!response.ok || !payload.inviteUrl) {
        throw new Error(payload.error ?? "Erro ao gerar o acesso.");
      }
      setInviteUrl(payload.inviteUrl);
      await navigator.clipboard?.writeText(payload.inviteUrl);
    } catch (inviteError) {
      onError(inviteError instanceof Error ? inviteError.message : "Erro ao gerar o acesso.");
    } finally {
      setBusy("");
    }
  }
  async function setStatus(user: AdminUser) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    setBusy(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Erro ao atualizar usuário.");
      await load();
    } catch (updateError) {
      onError(updateError instanceof Error ? updateError.message : "Erro ao atualizar usuário.");
    } finally {
      setBusy("");
    }
  }
  const totalRequests = users.reduce((sum, user) => sum + user.usage.requests, 0);
  const totalTokens = users.reduce((sum, user) => sum + user.usage.inputTokens + user.usage.outputTokens, 0);
  return (
    <div className="page">
      <Heading eyebrow="ADMINISTRAÇÃO" title="Usuários e consumo" />
      <section className="metrics admin-metrics">
        <Metric value={users.length} label="Usuários" detail="Contas cadastradas" tone="blue" />
        <Metric value={users.filter((user) => user.status === "active").length} label="Ativos" detail="Com acesso liberado" tone="green" />
        <Metric value={totalRequests} label="Chamadas de IA" detail="Histórico registrado" tone="amber" />
        <Metric value={totalTokens.toLocaleString("pt-BR")} label="Tokens" detail="Entrada + saída" tone="danger" />
      </section>
      <form className="panel invite-form" onSubmit={invite}>
        <PanelTitle eyebrow="NOVO ACESSO" title="Cadastrar usuário" />
        <div className="form-grid">
          <label>Nome<input name="name" required placeholder="Andreia" /></label>
          <label>E-mail<input name="email" type="email" required placeholder="email@exemplo.com" /></label>
          <input name="role" type="hidden" value="member" />
          <label>Plano<input name="plan" defaultValue="beta" /></label>
        </div>
        <p className="admin-note">{accessNote || "O usuário receberá um espaço privado e passará pelo onboarding."}</p>
        <button className="primary-button" disabled={busy === "invite"}>{busy === "invite" ? "Cadastrando…" : "Criar acesso"}</button>
        {inviteUrl && (
          <div className="invite-result">
            <strong>Link pronto — envie por WhatsApp ou e-mail</strong>
            <input value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={() => void navigator.clipboard?.writeText(inviteUrl)}>Copiar link</button>
            <small>Válido por 48 horas e utilizável uma única vez.</small>
          </div>
        )}
      </form>
      <div className="panel users-table">
        {users.map((user) => (
          <article className="user-row" key={user.id}>
            <span className="avatar">{initials(user.name)}</span>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
            <span className={`status-pill ${user.status}`}>{user.status === "active" ? "Ativo" : user.status === "suspended" ? "Suspenso" : "Convidado"}</span>
            <div className="usage-cell"><strong>{user.usage.requests}</strong><small>chamadas · {(user.usage.inputTokens + user.usage.outputTokens).toLocaleString("pt-BR")} tokens</small></div>
            <div className="user-actions">
              {user.role !== "superadmin" && user.status !== "suspended" && (
                <button className="primary-button" onClick={() => void generateAccess(user)} disabled={busy === `invite-${user.id}`}>
                  {busy === `invite-${user.id}` ? "Gerando…" : user.hasPassword ? "Redefinir acesso" : "Gerar convite"}
                </button>
              )}
              <button className={user.status === "suspended" ? "primary-button" : "danger-button"} onClick={() => void setStatus(user)} disabled={busy === user.id || user.role === "superadmin"}>
                {user.status === "suspended" ? "Reativar" : "Suspender"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Brand() { return <div className="brand"><span>S</span><p><strong>SOL</strong><small>Central de Comando</small></p></div>; }
function LoadingScreen() { return <main className="loading-screen"><Brand /><div className="loader" /><p>Organizando prioridades…</p></main>; }
function Metric({ value, label, detail, tone }: { value: number | string; label: string; detail: string; tone: string }) { return <article className={`metric ${tone}`}><div><strong>{value}</strong><span>↗</span></div><h3>{label}</h3><p>{detail}</p></article>; }
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="panel-title"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div></div>; }
function Heading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) { return <div className="heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}</button>}</div>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◇</span><p>{text}</p></div>; }
function TaskList({ tasks, projectMap, onToggle, onEdit, expanded = false }: { tasks: Task[]; projectMap: Record<string, string>; onToggle: (task: Task) => void; onEdit: (task: Task) => void; expanded?: boolean }) { return <div className="tasks">{tasks.map((task) => <article className={task.status === "concluida" ? "task done" : "task"} key={task.id}><button className="check" onClick={() => void onToggle(task)}>{task.status === "concluida" ? "✓" : ""}</button><button className="task-content" onClick={() => onEdit(task)}><header><strong>{task.title}</strong><span className={`priority ${task.priority}`}>{priorityLabel(task.priority)}</span></header><p>{task.projectId ? projectMap[task.projectId] ?? "Projeto" : "Sem projeto"} · <b className={isOverdue(task.dueAt, task.status) ? "atrasada" : task.status}>{dueLabel(task.dueAt)}</b></p>{expanded && task.reason && <small>Por quê: {task.reason}</small>}</button><button className="more" onClick={() => onEdit(task)}>•••</button></article>)}</div>; }
function Timeline({ time, title, text }: { time: string; title: string; text: string }) { return <article><span /><div><small>{time}</small><h3>{title}</h3>{text && <p>{text}</p>}</div></article>; }

function prioritizeTasks(items: Task[]) {
  const rank: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
  return items.slice().sort((a, b) => {
    if (a.status === "concluida" && b.status !== "concluida") return 1;
    if (b.status === "concluida" && a.status !== "concluida") return -1;
    const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return dueA - dueB || (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  });
}
function daysSince(value: string) { return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)); }
function isToday(value: string) { const date = new Date(value); const today = new Date(); return date.toDateString() === today.toDateString(); }
function isOverdue(value: string | null, status: string) { return Boolean(value && status !== "concluida" && new Date(value) < new Date()); }
function formatMoney(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0); }
function dateLabel() { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toUpperCase(); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function greetingTitle(name: string) { const hour = new Date().getHours(); return `${hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"}, ${name}.`; }
function statusLabel(value: string) { return ({ planejamento: "Planejamento", negociacao: "Negociação", ativo: "Ativo", aguardando: "Aguardando", pausado: "Pausado", concluido: "Concluído", pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" } as Record<string, string>)[value] ?? value; }
function priorityLabel(value: string) { return ({ critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa" } as Record<string, string>)[value] ?? value; }
function dueLabel(value: string | null) { if (!value) return "Sem prazo"; if (isOverdue(value, "pendente")) return `Atrasada · ${dateTime(value)}`; if (isToday(value)) return `Hoje · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`; return dateTime(value); }
function focusTitle(overdue: Task[], open: Task[]) { if (overdue.length) return `Você tem ${overdue.length} ${overdue.length === 1 ? "pendência atrasada" : "pendências atrasadas"}.`; if (open.length) return "Existe trabalho aberto. Escolha e termine."; return "Painel limpo. Defina a próxima ação que gera receita."; }
function focusText(overdue: Task[], open: Task[], mission: string) { const task = prioritizeTasks(overdue.length ? overdue : open)[0]; if (!task) return mission; return `${task.title}. ${task.reason || mission} Não abra outra frente antes de decidir isso.`; }
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "S"; }
function localDateToIso(value: string) { return value ? new Date(value).toISOString() : null; }
function isoToLocalDate(value?: string | null) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
