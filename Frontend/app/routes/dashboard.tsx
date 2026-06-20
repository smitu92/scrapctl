import type { Route } from "./+types/dashboard";
import { PipelineDashboard } from "~/features/workflow/components/pipeline-dashboard";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Pipeline Monitor" },
    { name: "description", content: "Real-time monitoring for scraping workflow" },
  ];
}

export default function DashboardRoute() {
  return (
    <PipelineDashboard />
  );
}
