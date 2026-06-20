import type { Route } from "./+types/monitor";
import { ConcurrentDashboard } from "~/features/workflow/components/concurrent-dashboard";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Active Monitor" },
    { name: "description", content: "Concurrent nodes and metrics" },
  ];
}

export default function MonitorRoute() {
  return <ConcurrentDashboard />;
}
