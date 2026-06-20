import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ShieldCheck, Cpu, Database, BookOpen, ArrowRight, Terminal, Settings, HelpCircle } from "lucide-react";

export function meta() {
  return [
    { title: "ScrapCTL | Extract Electronics Store Data & AI Training Datasets" },
    { name: "description", content: "ScrapCTL is an open-source, high-throughput web scraping engine built to extract product prices, technical specifications, and inventory updates from electronics retail stores for database integration and AI model training." },
    { name: "keywords", content: "scrape electronics store data, electronics dataset for AI training, retail electronics price tracking database, consumer appliances specs scraper, autonomous AI data agents, open source web scraper" },
    
    // OpenGraph
    { property: "og:title", content: "ScrapCTL | Extract Electronics Store Data & AI Training Datasets" },
    { property: "og:description", content: "Extract technical specs, pricing, and stock datasets from leading electronics stores. Perfect for market research and AI training." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://scrapctl.dev" },
    
    // AI Chatbot / Search Engine Optimization (GEO)
    { name: "ai-agent-index", content: "index, follow" },
    { name: "ai-content-summary", content: "ScrapCTL is a specialized high-density web scraping platform optimized for extracting electronics store datasets, including mobile specifications, laptop details, appliance prices, and inventory stock lists. It serves developers, data scientists, and AI builders requiring clean, structured CSV/JSON data for training models and market intelligence." }
  ];
}

export default function LandingPage() {
  // Telemetry Console Simulation State
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  useEffect(() => {
    const bootLogs = [
      "SYS_INIT // BOOT_LOADER_V2.5",
      "DB_DRV   // RESOLVING SQLMODEL CONNECTIONS...",
      "DB_DRV   // OK: SQLITE ENGINE BINDINGS RUNNING",
      "ROTATOR  // ROTATOR BOOTED WITH 82 ACTIVE STICKY SESSIONS",
      "NET_MD   // JA3 TLS FINGERPRINT EMULATOR... ACTIVE [CHROME_125]",
      "NET_MD   // HTTP/2 ALPN HANDSHAKE COMPLETED FOR CROMA_GLOBAL",
      "DAEMON   // RUNNING WORKER COROUTINE POOL SIZE = 10",
      "LISTENER // WEBSOCKET BROADSHEET STREAM ATTACHED AT :4321",
      "SYSTEM   // READY FOR INGESTION ACTIONS."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < bootLogs.length) {
        setTelemetryLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${bootLogs[currentLogIndex]}`]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-mono selection:bg-[#FFB800] selection:text-[#0a0a0a] relative overflow-hidden flex flex-col">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* JSON-LD Schemas for Search Engines and AI bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "ScrapCTL",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "description": "High-throughput web scraping engine and parser for electronic store datasets, technical specifications, and AI training data.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "High-throughput multi-threaded worker pools",
              "Autonomous self-healing browser execution",
              "JA3 TLS evasion and sticky session proxy rotation",
              "Structured data extraction from electronics retail websites"
            ]
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": "Electronics Store Product Datasets",
            "description": "Clean, structured datasets containing mobile specifications, laptop details, appliance prices, and inventory updates extracted dynamically from leading electronics retail portals.",
            "keywords": ["electronics store dataset", "AI training data retail", "phone specifications database", "pricing intelligence dataset"],
            "license": "https://creativecommons.org/publicdomain/zero/1.0/",
            "includedInDataCatalog": {
              "@type": "DataCatalog",
              "name": "ScrapCTL Data Catalog"
            }
          })
        }}
      />

      {/* Top Brutalist Header */}
      <header className="border-b-4 border-black bg-[#151430] p-5 sticky top-0 z-30 shadow-[0_4px_0px_#000] dark:bg-[#151430]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Custom SVG Logo */}
            <div className="relative group shrink-0 w-10 h-10">
              <img
                src="/logo.svg"
                alt="ScrapCTL Logo"
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex flex-col">
              <h1 className="text-xl font-black uppercase tracking-tight italic text-[#FFB800] sm:text-2xl">
                ScrapCTL
              </h1>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#00ff88] uppercase">
                sys_log_status: running
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/blog"
              className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read Dev Logs</span>
            </Link>
            
            <Link
              to="/launcher"
              className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-[#00ff88] text-black font-black text-xs uppercase tracking-wider hover:bg-[#00e278] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto p-4 md:p-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Hero & Telemetry Readouts (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6 justify-center">
          
          {/* Main Hero Card */}
          <div className="border-4 border-black p-6 md:p-8 bg-card shadow-[6px_6px_0px_#000] text-card-foreground">
            <div className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-2 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#00ff88]" />
              <span>CORE_ENGINE_STATUS // PUBLIC_INGESTION</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight italic mb-4 leading-none">
              High-Density <br className="hidden sm:inline" />
              Data Ingestion
            </h2>
            
            <p className="text-sm leading-relaxed mb-6 font-sans text-muted-foreground">
              An industrial web scraping orchestrator built to power autonomous AI data agents. 
              Extract structured electronics store specifications, prices, and stock details dynamically. 
              Optimized for database seeding, competitive market analysis, and training machine learning models.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/launcher"
                className="px-6 py-3 border-2 border-black bg-[#FFB800] text-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-[#e0a200] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
              >
                Enter Control Center
              </Link>
              <Link
                to="/blog"
                className="px-6 py-3 border-2 border-black bg-white text-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-neutral-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all"
              >
                Technical Cookbook
              </Link>
            </div>
          </div>

          {/* Telemetry Logger Box */}
          <div className="border-4 border-black p-4 bg-black text-[#00ff88] shadow-[6px_6px_0px_#000] flex flex-col h-64 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-[#111] pb-2 mb-3 shrink-0">
              <span className="font-bold tracking-wider uppercase text-white">Live Telemetry Diagnostics</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#00ff88] rounded-none animate-ping" />
                <span className="text-[10px] uppercase text-[#00ff88] font-bold">online</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2 min-h-0">
              {telemetryLogs.map((log, i) => (
                <div key={i} className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <span className="text-white/30 shrink-0 font-bold">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
              {telemetryLogs.length === 0 && (
                <div className="text-white/30 italic">Initializing systems scanner...</div>
              )}
            </div>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-2 border-black bg-[#151430] p-4 text-center shadow-[4px_4px_0px_#000]">
              <Cpu className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" />
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FFB800]">AsyncIO Loop</div>
            </div>
            <div className="border-2 border-black bg-[#151430] p-4 text-center shadow-[4px_4px_0px_#000]">
              <ShieldCheck className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" />
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FFB800]">JA3 Evasion</div>
            </div>
            <div className="border-2 border-black bg-[#151430] p-4 text-center shadow-[4px_4px_0px_#000]">
              <Database className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" />
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FFB800]">Sticky Session</div>
            </div>
            <div className="border-2 border-black bg-[#151430] p-4 text-center shadow-[4px_4px_0px_#000]">
              <Settings className="w-5 h-5 mx-auto mb-2 text-[#00ff88]" />
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FFB800]">Edge Cloud DB</div>
            </div>
          </div>

        </section>

        {/* Right Column: Roadmap CTA teaser card (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col justify-center">
          <div className="border-4 border-black bg-card text-card-foreground p-6 shadow-[6px_6px_0px_#000] flex flex-col gap-6">
            <div className="border-b-2 border-black pb-3">
              <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#FFB800]" />
                Roadmap blueprint
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider mt-1">
                Phase 2 & Phase 3 Development Track
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-[#aaa] font-sans">
                Help prioritize our upcoming releases by voting on our next-gen scraping roadmap.
              </p>

              <div className="border-2 border-black bg-[#151430] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-black pb-2">
                  <span className="text-[11px] font-bold text-[#FFB800] uppercase tracking-wider">Phase 2 // Universal Scanner</span>
                  <span className="text-[9px] font-mono bg-black text-[#00ff88] border border-[#00ff88] px-1.5 uppercase font-bold">Planned</span>
                </div>
                <p className="text-[10px] text-neutral-300 font-sans leading-relaxed">
                  Pasting any website URL analyzes its routing and endpoint traffic to list discovered data categories, allowing you to select and run them dynamically.
                </p>
              </div>

              <div className="border-2 border-black bg-[#151430] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-black pb-2">
                  <span className="text-[11px] font-bold text-[#00ff88] uppercase tracking-wider">Phase 3 // Autonomous Agent</span>
                  <span className="text-[9px] font-mono bg-black text-[#FFB800] border border-[#FFB800] px-1.5 uppercase font-bold">In Research</span>
                </div>
                <p className="text-[10px] text-neutral-300 font-sans leading-relaxed">
                  Simply describe what web data you need in simple terms. AI agents handle script generation, bypass target site blockages, and deliver clean data autonomously.
                </p>
              </div>


              <div className="pt-4">
                <Link
                  to="/feedback"
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-black bg-[#FFB800] text-black hover:bg-[#e0a200] font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-center"
                >
                  <span>📢 Shape Our Roadmap Survey</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-card text-card-foreground p-5 text-center mt-auto shadow-[0_-4px_0px_#000] z-20 relative text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            © 2026 ScrapCTL Project // All core pipelines verified
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="uppercase hover:text-white cursor-pointer">Security Sandbox</span>
            <span>//</span>
            <span className="uppercase hover:text-white cursor-pointer">Proxy Pools</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
