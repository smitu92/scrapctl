import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    // Public landing page (no sidebar navigation wrapper)
    index("routes/landing.tsx"),
    route("feedback", "routes/feedback.tsx"),


    // Dashboard routes wrapped by layouts/sidebar
    layout("routes/layout.tsx", [
        route("launcher", "routes/home.tsx"), // Fills Outlet at "/launcher"
        route("dabeli", "routes/dabeli.tsx"),
        route("pipeline", "routes/dashboard.tsx"),
        route("monitor", "routes/monitor.tsx"),
        route("proxies", "routes/proxies.tsx"),
        route("projects", "routes/projects.tsx"),
        route("settings", "routes/settings.tsx"),
        route("blog", "features/blog/routes/blog-page.tsx"),
        route("blogs", "routes/blogs-redirect.tsx"),
    ]),
] satisfies RouteConfig;
