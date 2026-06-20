import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: "github-dark", // Drizzle/shadcn typically uses dark themes for code
              keepBackground: false,
            },
          ],
        ],
      }),
    },
    tailwindcss(), 
    reactRouter()
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
});
