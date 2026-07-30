"use client";

import { useMemo, useRef, useState } from "react";

type Tab = "inicio" | "atividades" | "projetos" | "historico" | "ajustes";
type Task = {
  id: number;
  title: string;
  project: string;
  due: string;
  status: "atrasada" | "hoje" | "aguardando" | "concluida";
  priority: "Crítica" | "Alta" | "Média";
  reason: string;
};

const seedTasks: Task[] = [
  { id: 1, title: "Fazer follow-up da proposta", project: "Dr. Ismael", due: "Atrasada há 5 dias", status: "atrasada", priority: "Crítica", reason: "Transformar o atendimento por WhatsApp em receita recorrente." },
  { id: 2, title: "Definir próxima ação comercial", project: "Aston", due: "Hoje, 10:30", status: "hoje", priority: "Alta", reason: "Avançar uma oportunidade com potencial de contrato de longo prazo." },
  { id: 3, title: "Preparar oferta para brasileiros no exterior", project: "Prospecção Exterior", due: "Hoje, 15:00", status: "hoje", priority: "Alta", reason: "Criar uma frente de receita em dólar com serviços automatizados." },
  { id: 4, title: "Aguardar retorno sobre a proposta", project: "Chocomilk", due: "Follow-up amanhã", status: "aguardando", priority: "Média", reason: "Validar um produto replicável em outros comércios." },
];

const projects = [
  { name: "Dr. Ismael", status: "Negociação", days: 5, recurring: true, tone: "purple" },
  { name: "Aston", status: "Em andamento", days: 2, recurring: true, tone: "blue" },
  { name: "Prospecção Exterior", status: "Planejamento", days: 0, recurring: true, tone: "green" },
  { name: "Chocomilk", status: "Aguardando cliente", days: 4, recurring: false, tone: "orange" },
  { name: "Cris Paula", status: "Campanha finalizada", days: 7, recurring: true, tone: "pink" },
  { name: "Duck’s Team", status: "Aguardando validação", days: 9, recurring: false, tone: "slate" },
];

const nav: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Início", icon: "⌂" },
  { id: "atividades", label: "Atividades", icon: "✓" },
  { id: "projetos", label: "Projetos", icon: "▦" },
  { id: "historico", label: "Histórico", icon: "↺" },
  { id: "ajustes", label: "Ajustes", icon: "⚙" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [tasks, setTasks] = useState(seedTasks);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const recognitionRef = useRef<{ stop?: () => void } | null>(null);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "concluida"), [tasks]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === "concluida" ? "hoje" : "concluida" } : task));
  }

  function startListening() {
    type SpeechCtor = new () => {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onend: () => void; start: () => void; stop: () => void;
    };
    const browserWindow = window as typeof window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    setAssistantOpen(true);
    if (!Recognition) {
      setTranscript("Use o microfone do teclado para ditar. O reconhecimento direto não está disponível neste navegador.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setTranscript(text);
      setMessage(text);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function sendMessage() {
    if (!message.trim()) return;
    setTranscript(message);
    setMessage("");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          {nav.map((item) => <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="mission"><small>SEU NORTE</small><p>Menos trabalho manual. Mais receita recorrente. Mais segurança para sua família.</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-logo"><Brand /></div>
          <div><p className="eyebrow">QUINTA-FEIRA, 30 DE JULHO</p><h1>{tab === "inicio" ? "Bom dia, Diego." : nav.find((item) => item.id === tab)?.label}</h1></div>
          <button className="avatar">DA</button>
        </header>

        {tab === "inicio" && <div className="page">
          <section className="focus">
            <div><p className="eyebrow light">FOCO AGORA</p><h2>Você está evitando o projeto mais próximo do dinheiro.</h2><p>O follow-up do Dr. Ismael está atrasado há 5 dias. Você começou isso para construir receita recorrente, não para acumular propostas paradas.</p></div>
            <button onClick={() => setTab("atividades")}>Começar agora →</button>
          </section>
          <section className="metrics">
            <Metric value={openTasks.filter((t) => t.status === "atrasada").length} label="Atrasadas" detail="Exigem decisão hoje" tone="danger" />
            <Metric value={openTasks.filter((t) => t.status === "hoje").length} label="Para hoje" detail="Duas são prioridade alta" tone="blue" />
            <Metric value={projects.filter((p) => p.days >= 7).length} label="Sem atualização" detail="Há mais de 7 dias" tone="amber" />
            <Metric value={projects.filter((p) => p.recurring).length} label="Com recorrência" detail="Sua direção estratégica" tone="green" />
          </section>
          <section className="dashboard-grid">
            <div className="panel"><PanelTitle eyebrow="PRÓXIMAS AÇÕES" title="Hoje não termina sem isso" /><TaskList tasks={openTasks.slice(0, 3)} onToggle={toggleTask} /></div>
            <div className="panel radar"><PanelTitle eyebrow="RADAR" title="Projetos parados" />{projects.filter((p) => p.days >= 4).slice(0, 4).map((project) => <button className="project-row" key={project.name} onClick={() => setTab("projetos")}><span className={`project-dot ${project.tone}`}>{project.name[0]}</span><span><strong>{project.name}</strong><small>{project.status}</small></span><b>{project.days}d</b></button>)}</div>
          </section>
        </div>}

        {tab === "atividades" && <div className="page">
          <Heading eyebrow="EXECUÇÃO" title="Todas as atividades" action="＋ Nova atividade" />
          <div className="filters"><button className="active">Todas</button><button>Atrasadas</button><button>Hoje</button><button>Aguardando</button></div>
          <div className="panel"><TaskList tasks={tasks} onToggle={toggleTask} expanded /></div>
        </div>}

        {tab === "projetos" && <div className="page">
          <Heading eyebrow="VISÃO GERAL" title="Projetos ativos" action="＋ Novo projeto" />
          <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.name}><div><span className={`project-dot large ${project.tone}`}>{project.name[0]}</span>{project.recurring && <em>Recorrência</em>}</div><h3>{project.name}</h3><p>{project.status}</p><footer><span>Última atualização</span><strong>{project.days === 0 ? "Hoje" : `há ${project.days} dias`}</strong></footer></article>)}</div>
        </div>}

        {tab === "historico" && <div className="page narrow"><Heading eyebrow="MEMÓRIA" title="Histórico de decisões" /><div className="timeline"><Timeline time="Hoje, 07:42" title="Central de Comando iniciada" text="Definido o uso de cache de contexto e três provedores de IA." /><Timeline time="Ontem, 18:10" title="Campanha da Cris finalizada" text="Resultado registrado e projeto movido para acompanhamento." /><Timeline time="23 jul, 09:20" title="Aston atualizada" text="Apresentação e proposta comercial preparadas." /></div></div>}

        {tab === "ajustes" && <div className="page narrow">
          <Heading eyebrow="CONTROLE" title="Provedores de IA" />
          <div className="panel settings"><label>IA ativa agora</label><div className="providers">{["OpenAI", "Google Gemini", "Anthropic Claude"].map((item) => <button className={provider === item ? "active" : ""} onClick={() => setProvider(item)} key={item}><span>{item[0]}</span>{item}</button>)}</div>
          {["OpenAI", "Google Gemini", "Anthropic Claude"].map((item) => <div className="api-row" key={item}><div><strong>{item}</strong><small>{item === provider ? "Em uso" : "Não configurada"}</small></div><code>••••••••••••••••</code><button>Configurar</button></div>)}
          <div className="security"><span>◈</span><p><strong>Suas chaves ficam protegidas.</strong><br />As credenciais completas nunca aparecem no navegador.</p></div></div>
        </div>}
      </section>

      <button className={listening ? "voice listening" : "voice"} onClick={() => listening ? recognitionRef.current?.stop?.() : startListening()}><span>{listening ? "■" : "●"}</span><small>{listening ? "Ouvindo" : "Falar"}</small></button>
      <nav className="mobile-nav">{nav.slice(0, 4).map((item) => <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>

      {assistantOpen && <div className="backdrop" onClick={() => setAssistantOpen(false)}><section className="assistant" onClick={(event) => event.stopPropagation()}><div className="handle" /><header><div><span className="sol">S</span><p><strong>SOL</strong><small>{provider} · Contexto atualizado</small></p></div><button onClick={() => setAssistantOpen(false)}>×</button></header><div className="assistant-message">Diego, vamos direto ao ponto. O que precisa ser registrado ou resolvido agora?</div>{listening && <div className="wave">{[1,2,3,4,5,6,7].map((i) => <i key={i} />)}</div>}{transcript && <><div className="user-message">{transcript}</div><div className="assistant-message firm">Entendi. Antes de abrir uma nova frente, vou verificar suas prioridades e transformar isso em uma próxima ação objetiva.</div></>}<footer><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Digite ou use o microfone do teclado…" /><button onClick={sendMessage}>↑</button></footer></section></div>}
    </main>
  );
}

function Brand() { return <div className="brand"><span>S</span><p><strong>SOL</strong><small>Central de Comando</small></p></div>; }
function Metric({ value, label, detail, tone }: { value: number; label: string; detail: string; tone: string }) { return <article className={`metric ${tone}`}><div><strong>{value}</strong><span>↗</span></div><h3>{label}</h3><p>{detail}</p></article>; }
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="panel-title"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div></div>; }
function Heading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button>{action}</button>}</div>; }
function TaskList({ tasks, onToggle, expanded = false }: { tasks: Task[]; onToggle: (id: number) => void; expanded?: boolean }) { return <div className="tasks">{tasks.map((task) => <article className={task.status === "concluida" ? "task done" : "task"} key={task.id}><button className="check" onClick={() => onToggle(task.id)}>{task.status === "concluida" ? "✓" : ""}</button><div><header><strong>{task.title}</strong><span className={`priority ${task.priority}`}>{task.priority}</span></header><p>{task.project} · <b className={task.status}>{task.due}</b></p>{expanded && <small>Por quê: {task.reason}</small>}</div><button className="more">•••</button></article>)}</div>; }
function Timeline({ time, title, text }: { time: string; title: string; text: string }) { return <article><span /><div><small>{time}</small><h3>{title}</h3><p>{text}</p></div></article>; }
