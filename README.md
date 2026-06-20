# ScrapCTL — Modern Scraping Control Center

ScrapCTL is a modular, high-concurrency web scraping and proxy management application built with FastAPI and React Router v7.

---

## 📂 Repository Directory Map

To keep the repository clean and structured, all documentation and metadata files have been classified based on their target audience:

### 🤖 1. [agent_context/](agent_context/) (For AI Coding Agents)
*   **[GEMINI.md](agent_context/GEMINI.md)**: Main developer context, rules, and workspace guidelines for AI pair-programmers.
*   **[scrapctl_architecture_memory.md](agent_context/scrapctl_architecture_memory.md)**: System blueprints, active endpoints, data schemas, and key design architectures.
*   **[DEVELOPER_JOURNEY.md](agent_context/DEVELOPER_JOURNEY.md)**: Chronological journal tracking implementation progress, timestamps, and plans.

### 💻 2. [dev_insights/](dev_insights/) (For Developers & Users)
*   **[README.md](dev_insights/README.md)**: Core backend boot, dependency guide, and installation instruction manual.
*   **[FRONTEND_README.md](dev_insights/FRONTEND_README.md)**: Setup, build, and deployment guidelines for the React Router V7 dashboard.
*   **[PROJECT_HISTORY.md](dev_insights/PROJECT_HISTORY.md)**: Archive of key technical decisions from Phase 1 to V2.5.
*   **[PROJECT_JOURNAL.md](dev_insights/PROJECT_JOURNAL.md)**: Milestone sprint logs and historic features list.
*   **[security_audit_report.md](dev_insights/security_audit_report.md)**: Log of security audits, identified vulnerabilities (IDOR, SSRF, Path Traversal), and their corresponding resolution status.
*   **[cookbooks/](dev_insights/cookbooks/)**: Subfolder containing system guides and learning materials:
    *   **[proxy_latency_fix_notes.md](dev_insights/cookbooks/proxy_latency_fix_notes.md)**: Analysis and patches for connection latency and rate-limit fixes.
    *   **[design/](dev_insights/cookbooks/design/)**: Complete layout structures, HTML mockups, and visual screenshots of past dashboard design runs.

---

## ⚡ Quick Start

For detailed step-by-step setup guides, please refer directly to the corresponding manuals:
*   🚀 To spin up and run the FastAPI Backend, see [dev_insights/README.md](dev_insights/README.md).
*   ⚛️ To run the React Router Frontend Dashboard locally or deploy it, see [dev_insights/FRONTEND_README.md](dev_insights/FRONTEND_README.md).
