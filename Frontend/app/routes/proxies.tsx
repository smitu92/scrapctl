import type { Route } from "./+types/proxies";
import { ProxyDashboard } from "~/features/proxies/components/proxy-dashboard";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ScrapCTL | Proxy Manager" },
    { name: "description", content: "Proxy rotation and management" },
  ];
}

export default function ProxiesRoute() {
  return <ProxyDashboard />;
}
