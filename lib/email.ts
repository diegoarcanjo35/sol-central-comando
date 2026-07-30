type EmailEnv = {
  RESEND_API_KEY?: string;
  SOL_EMAIL_FROM?: string;
};

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as EmailEnv;
  if (!runtimeEnv.RESEND_API_KEY || !runtimeEnv.SOL_EMAIL_FROM) {
    throw new Error("A recuperação por e-mail ainda não foi configurada pelo administrador.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: runtimeEnv.SOL_EMAIL_FROM,
      to: [input.to],
      subject: "Redefina sua senha do SOL",
      text: `Olá, ${input.name}. Use este link para redefinir sua senha do SOL: ${input.resetUrl}. O link expira em 48 horas e funciona uma única vez.`,
      html: `<p>Olá, ${escapeHtml(input.name)}.</p><p>Recebemos uma solicitação para redefinir sua senha do SOL.</p><p><a href="${escapeHtml(input.resetUrl)}">Criar uma nova senha</a></p><p>O link expira em 48 horas e funciona uma única vez. Se você não fez esta solicitação, ignore este e-mail.</p>`,
    }),
  });
  if (!response.ok) {
    throw new Error("O serviço de e-mail não conseguiu enviar a recuperação. Tente novamente.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
