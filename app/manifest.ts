import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOL — Central de Comando",
    short_name: "SOL",
    description: "Painel pessoal de projetos, atividades e decisões.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#151827",
    orientation: "portrait",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
