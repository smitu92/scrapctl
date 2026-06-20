import type { Route } from "./+types/projects";
import { ProjectsDashboard } from "~/features/projects/components/projects-dashboard";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Projects" },
    { name: "description", content: "Project output and file explorer" },
  ];
}

export default function ProjectsRoute() {
  return <ProjectsDashboard />;
}
