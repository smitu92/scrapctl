import type { Route } from "./+types/home";
import { TaskLauncher } from "~/features/workflow/components/task-launcher";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Universal Launcher" },
    { name: "description", content: "Industrial scraping control dashboard" },
  ];
}

export default function Home() {
  return (
    <div className="animate-in fade-in duration-300">
      <TaskLauncher />
    </div>
  );
}

