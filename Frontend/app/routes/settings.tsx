import type { Route } from "./+types/settings";
import { SettingsDashboard } from "~/features/settings/components/settings-dashboard";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Settings" },
    { name: "description", content: "Global configuration" },
  ];
}

export default function SettingsRoute() {
  return <SettingsDashboard />;
}
