import { useState } from "react";
import { Link } from "react-router";
import { Cpu, ShieldCheck, Database, Settings, HelpCircle, Mail, ArrowLeft, Send, Check } from "lucide-react";
import axios from "axios";

export function meta() {
  return [
    { title: "ScrapCTL | Dynamic Roadmap Survey & Electronics Datasets" },
    { name: "description", content: "Participate in the ScrapCTL roadmap survey to prioritize our dynamic URL scans and autonomous AI agent tools. Learn about our data pipelines designed to extract specifications and pricing models from online tech stores." },
    { name: "keywords", content: "scrape electronics store data, electronics dataset for AI, dynamic web scraping survey, retail products specifications crawler, ScrapCTL roadmap" },
    
    // OpenGraph
    { property: "og:title", content: "ScrapCTL | Dynamic Roadmap Survey & Electronics Datasets" },
    { property: "og:description", content: "Vote on upcoming features, including universal URL-to-data parsers and self-healing scraping sandboxes for electronics datasets." },
    { property: "og:type", content: "website" },
    
    // AI Chatbot / Search Engine Optimization (GEO)
    { name: "ai-agent-index", content: "index, follow" },
    { name: "ai-content-summary", content: "This page collects preferences and feedback for ScrapCTL's web scraping roadmap. Users can vote on Phase 2 (Universal URL-to-data scanner for retail product specifications) and Phase 3 (Self-healing AI agent loop designed for fully automated data collection of electronics and appliances for training ML models)." }
  ];
}

export default function FeedbackPage() {
  // Form fields
  const [focusOnUrl, setFocusOnUrl] = useState(true);
  const [openSource, setOpenSource] = useState(true);
  const [profession, setProfession] = useState("");
  const [usecase, setUsecase] = useState("");
  const [whyLove, setWhyLove] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await axios.post("/api/feedback", {
        email: email.trim() || null,
        focus_on_url_scraping: focusOnUrl,
        open_source_project: openSource,
        profession: profession.trim() || null,
        usecase: usecase.trim() || null,
        why_love: whyLove.trim() || null,
        message: message.trim() || null,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Submission failed. Verify database connectivity.");
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Header */}
      <header className="border-b-4 border-black bg-[#151430] p-5 sticky top-0 z-30 shadow-[0_4px_0px_#000]">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="relative w-10 h-10 block hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="ScrapCTL Logo" className="w-full h-full object-contain" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-black uppercase tracking-tight italic text-[#FFB800]">
                ScrapCTL // Roadmap Survey
              </h1>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#00ff88] uppercase">
                sys_survey_active: true
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-[#aaa] hover:text-white uppercase font-bold border-2 border-transparent hover:border-black hover:bg-neutral-800/40 px-3 py-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Landing</span>
            </Link>
            <Link
              to="/launcher"
              className="px-4 py-2 border-2 border-black bg-[#00ff88] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#00dd75] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Control Center
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Side: Product Roadmap Plan (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="border-4 border-black bg-[#151430] p-6 shadow-[6px_6px_0px_#000]">
            <h2 className="text-2xl font-black uppercase tracking-tight italic text-[#FFB800] mb-2 flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#FFB800] animate-spin-slow" />
              ROADMAP BLUEPRINT
            </h2>
            <p className="text-xs text-[#aaa] leading-relaxed mb-6 font-sans">
              Here is how we are building the future of web scraping. Instead of static scraper scripts built for just one website, we are moving to a fully dynamic structure.
            </p>

            {/* In-depth Roadmap Breakdown */}
            <div className="space-y-6">
              
              {/* Phase 2 details */}
              <div className="border-2 border-black bg-black/60 p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-black pb-2">
                  <h3 className="text-base font-black uppercase tracking-tight text-[#FFB800]">
                    Phase 2: Universal Site Scanner (Dynamic)
                  </h3>
                  <span className="text-[9px] font-mono bg-black text-[#00ff88] border border-[#00ff88] px-2 py-0.5 uppercase font-bold">Planned</span>
                </div>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  Right now, our scrapers are hardcoded for specific targets (like Croma). In Phase 2, you can paste <strong>any website address</strong>. Our backend automatically analyzes the site's routing and endpoint traffic to list categories of data discovered. You then select a category and run it to pull dynamic data instantly.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[9px] font-bold text-white uppercase font-mono">
                  <div className="bg-black/40 p-2 border border-neutral-800">1. Paste Link</div>
                  <div className="bg-black/40 p-2 border border-neutral-800">2. Scanner Finds Categories</div>
                  <div className="bg-black/40 p-2 border border-neutral-800">3. Extract Dynamic Data</div>
                </div>
              </div>

              {/* Phase 3 details */}
              <div className="border-2 border-black bg-black/60 p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-black pb-2">
                  <h3 className="text-base font-black uppercase tracking-tight text-[#00ff88]">
                    Phase 3: Autonomous AI Agent Ingestion
                  </h3>
                  <span className="text-[9px] font-mono bg-black text-[#FFB800] border border-[#FFB800] px-2 py-0.5 uppercase font-bold">In Research</span>
                </div>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  No links, no endpoint analysis, and no options to choose. Just type what data you need in simple terms (e.g. <em>"Show me all laptops under $800 from Amazon"</em>). AI agents will execute the scraping sandbox, bypass blocks, and deliver the clean data autonomously.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-center text-[9px] font-bold text-white uppercase font-mono">
                  <div className="bg-black/40 p-2 border border-neutral-800">1. Ask for Data</div>
                  <div className="bg-black/40 p-2 border border-neutral-800">2. AI Agent Handles Everything</div>
                </div>
              </div>

              {/* Clean, Simple System Flow Diagram */}
              <div className="border-2 border-black bg-black p-4">
                <div className="text-[10px] uppercase font-bold text-neutral-400 mb-4 border-b border-neutral-900 pb-1">
                  How ScrapCTL Processes Web Data:
                </div>
                
                <svg viewBox="0 0 600 370" className="w-full h-auto">
                  {/* Phase 2 Box */}
                  <rect x="10" y="10" width="270" height="260" rx="3" fill="#0f0f1c" stroke="#FF7A00" strokeWidth="2" />
                  <text x="25" y="32" fill="#FF7A00" fontSize="11" fontWeight="bold" className="font-mono uppercase tracking-wider">Phase 2: Universal Scanner</text>
                  
                  <rect x="25" y="65" width="240" height="35" rx="2" fill="#151430" stroke="#FF7A00" strokeWidth="1" />
                  <text x="35" y="87" fill="#fff" fontSize="10" className="font-mono">User enters website URL</text>
                  
                  <path d="M145 100 V130" stroke="#FF7A00" strokeWidth="2" strokeDasharray="3" />
                  
                  <rect x="25" y="130" width="240" height="35" rx="2" fill="#151430" stroke="#00ff88" strokeWidth="1" />
                  <text x="35" y="152" fill="#00ff88" fontSize="10" className="font-mono">Backend scans categories</text>
                  
                  <path d="M145 165 V195" stroke="#00ff88" strokeWidth="2" strokeDasharray="3" />
                  
                  <rect x="25" y="195" width="240" height="35" rx="2" fill="#151430" stroke="#FF7A00" strokeWidth="1" />
                  <text x="35" y="217" fill="#fff" fontSize="10" className="font-mono">Select category & get data</text>

                  {/* Phase 3 Box */}
                  <rect x="310" y="10" width="280" height="260" rx="3" fill="#0f0f1c" stroke="#00ff88" strokeWidth="2" />
                  <text x="325" y="32" fill="#00ff88" fontSize="11" fontWeight="bold" className="font-mono uppercase tracking-wider">Phase 3: Autonomous Agent</text>
                  
                  <rect x="325" y="65" width="250" height="35" rx="2" fill="#151430" stroke="#00ff88" strokeWidth="1" />
                  <text x="335" y="87" fill="#fff" fontSize="10" className="font-mono">Describe data target in chat</text>
                  
                  <path d="M450 100 V130" stroke="#00ff88" strokeWidth="2" strokeDasharray="3" />
                  
                  <rect x="325" y="130" width="250" height="35" rx="2" fill="#151430" stroke="#FF7A00" strokeWidth="1" />
                  <text x="335" y="152" fill="#FF7A00" fontSize="10" className="font-mono">Agent scripts & scans site</text>
                  
                  <path d="M450 165 V195" stroke="#FF7A00" strokeWidth="2" strokeDasharray="3" />
                  
                  <rect x="325" y="195" width="250" height="35" rx="2" fill="#151430" stroke="#00ff88" strokeWidth="1" />
                  <text x="335" y="217" fill="#00ff88" fontSize="10" className="font-mono">Delivers clean dataset</text>

                  {/* Central Database Connection */}
                  <rect x="150" y="295" width="300" height="50" rx="4" fill="#151430" stroke="#fff" strokeWidth="2" />
                  <text x="210" y="325" fill="#fff" fontSize="11" fontWeight="bold" className="font-mono uppercase tracking-widest">🗄️ Relational Database</text>
                  
                  <path d="M145 255 V295" stroke="#FF7A00" strokeWidth="1.5" />
                  <path d="M450 255 V295" stroke="#00ff88" strokeWidth="1.5" />
                </svg>
              </div>

            </div>
          </div>

          {/* Infrastructure Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-black bg-black p-4 flex gap-3 items-center">
              <Cpu className="w-8 h-8 text-[#00ff88] shrink-0" />
              <div>
                <h4 className="text-[11px] font-bold text-white uppercase">Self-Healing</h4>
                <p className="text-[9px] text-[#888] font-sans">Compiles and repairs scripting errors dynamically in a sandbox.</p>
              </div>
            </div>
            <div className="border-2 border-black bg-black p-4 flex gap-3 items-center">
              <ShieldCheck className="w-8 h-8 text-[#FFB800] shrink-0" />
              <div>
                <h4 className="text-[11px] font-bold text-white uppercase">Header Evasion</h4>
                <p className="text-[9px] text-[#888] font-sans">Automated JA3 browser handshake emulators skip rate blocks.</p>
              </div>
            </div>
            <div className="border-2 border-black bg-black p-4 flex gap-3 items-center">
              <Database className="w-8 h-8 text-[#00ff88] shrink-0" />
              <div>
                <h4 className="text-[11px] font-bold text-white uppercase">SQLModel DB</h4>
                <p className="text-[9px] text-[#888] font-sans">Dynamic, unified ingestion tables store findings safely.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Simple Feedback Form (5 Columns) */}
        <section className="lg:col-span-5">
          <div className="border-4 border-black bg-card text-card-foreground p-6 shadow-[6px_6px_0px_#000] flex flex-col gap-5 relative">
            <div className="border-b-2 border-black pb-3">
              <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#FFB800]" />
                ROADMAP SURVEY
              </h3>
              <p className="text-[9px] font-mono text-muted-foreground uppercase font-bold tracking-wider mt-1">
                Help prioritize our upcoming releases.
              </p>
            </div>

            {submitted ? (
              <div className="bg-[#151430] border-2 border-[#00ff88] p-6 text-center space-y-4 my-8 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-none bg-[#00ff88] flex items-center justify-center mx-auto text-black font-black">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Preferences Saved</h4>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  Thank you! Your preferences and use case parameters have been recorded in the central database. We will use these data metrics to prioritize development.
                </p>
                <div className="pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs underline text-[#00ff88] hover:text-white uppercase font-bold text-center block"
                  >
                    Submit Another Response
                  </button>
                  <Link
                    to="/launcher"
                    className="mt-2 block py-2 border-2 border-black bg-white text-black font-black text-xs uppercase"
                  >
                    Go to Control Center
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Simplified Question 1 */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider block text-foreground">
                    1. Scrape any website by pasting its link?
                  </label>
                  <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                    Would you prefer a simple interface where you paste a web page link and get data categories immediately (instead of writing custom scrapers and code configurations)?
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFocusOnUrl(true)}
                      className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                        focusOnUrl 
                          ? "bg-[#00ff88] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                          : "bg-[#1e1e24] text-[#888] hover:text-white"
                      }`}
                    >
                      Yes, paste link
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusOnUrl(false)}
                      className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                        !focusOnUrl 
                          ? "bg-[#00ff88] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                          : "bg-[#1e1e24] text-[#888] hover:text-white"
                      }`}
                    >
                      No, custom code
                    </button>
                  </div>
                </div>

                {/* Simplified Question 2 */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider block text-foreground">
                    2. Prioritize Open Source self-hosting?
                  </label>
                  <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                    Do you want an open source code repository you can download and run on your own machine/server, rather than a paid cloud subscription?
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setOpenSource(true)}
                      className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                        openSource 
                          ? "bg-[#00ff88] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                          : "bg-[#1e1e24] text-[#888] hover:text-white"
                      }`}
                    >
                      Yes, open source
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenSource(false)}
                      className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                        !openSource 
                          ? "bg-[#00ff88] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
                          : "bg-[#1e1e24] text-[#888] hover:text-white"
                      }`}
                    >
                      No, cloud SaaS
                    </button>
                  </div>
                </div>

                {/* Field: Profession */}
                <div className="space-y-1">
                  <label htmlFor="profession" className="text-xs font-black uppercase tracking-wider block text-foreground">
                    Your Profession / Role
                  </label>
                  <input
                    id="profession"
                    type="text"
                    required
                    placeholder="e.g. Developer, Researcher, Business Owner, etc."
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black bg-white text-black rounded-none focus:outline-none focus:ring-2 focus:ring-[#FFB800] placeholder-neutral-400 font-mono"
                  />
                </div>

                {/* Field: Usecase */}
                <div className="space-y-1">
                  <label htmlFor="usecase" className="text-xs font-black uppercase tracking-wider block text-foreground">
                    What websites do you want to scrape?
                  </label>
                  <textarea
                    id="usecase"
                    rows={2}
                    required
                    placeholder="e.g. Amazon prices daily, local real estate links, social media trends..."
                    value={usecase}
                    onChange={(e) => setUsecase(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black bg-white text-black rounded-none focus:outline-none focus:ring-2 focus:ring-[#FFB800] placeholder-neutral-400 font-mono resize-none"
                  />
                </div>

                {/* Field: Why Love */}
                <div className="space-y-1">
                  <label htmlFor="whyLove" className="text-xs font-black uppercase tracking-wider block text-foreground">
                    Why would you love ScrapCTL?
                  </label>
                  <textarea
                    id="whyLove"
                    rows={2}
                    placeholder="e.g. Need self-healing, need low-latency scraper, Apify blocks too often..."
                    value={whyLove}
                    onChange={(e) => setWhyLove(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black bg-white text-black rounded-none focus:outline-none focus:ring-2 focus:ring-[#FFB800] placeholder-neutral-400 font-mono resize-none"
                  />
                </div>

                {/* Email (Optional) */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-foreground">
                    <Mail className="w-3.5 h-3.5 text-[#FFB800]" />
                    <span>Email Address (Optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@server.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black bg-white text-black rounded-none focus:outline-none focus:ring-2 focus:ring-[#FFB800] placeholder-neutral-400 font-mono"
                  />
                </div>

                {/* Message / Feedback Details */}
                <div className="space-y-1">
                  <label htmlFor="message" className="text-xs font-black uppercase tracking-wider block text-foreground">
                    Additional Comments or Suggestions
                  </label>
                  <textarea
                    id="message"
                    rows={2}
                    placeholder="Any custom protocols, proxy types, or feature requests..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black bg-white text-black rounded-none focus:outline-none focus:ring-2 focus:ring-[#FFB800] placeholder-neutral-400 font-mono resize-none"
                  />
                </div>

                {error && (
                  <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider border border-red-500/40 p-2 bg-red-500/10">
                    ⚠️ Error: {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-black bg-black text-white hover:bg-neutral-900 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? (
                    <span>Logging preferences...</span>
                  ) : (
                    <span>Submit Survey Preference</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-black py-6 text-center text-[10px] text-neutral-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-widest uppercase">ScrapCTL v2.5</span>
            <span className="text-[#FFB800]">// Ingestion Blueprint Active</span>
          </div>
          <span>© 2026 ScrapCTL Project // All core pipelines verified</span>
        </div>
      </footer>
    </div>
  );
}
