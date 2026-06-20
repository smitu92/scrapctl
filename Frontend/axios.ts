import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4321"         
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const browserId = localStorage.getItem("browser_id");
        if (browserId) {
            config.headers["X-Browser-Id"] = browserId;
        }
    }
    return config;
});

export default api;