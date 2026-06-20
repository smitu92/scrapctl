import { useState, useEffect, useRef } from "react";
import { BookOpen, ArrowRight, CornerDownRight } from "lucide-react";
import ScrapctlJourney from "../content/scrapctl-journey.mdx";

export function meta() {
  return [
    { title: "ScrapCTL | Engineering Chronicles: Scraping Electronics Store Data" },
    { name: "description", content: "Read our engineering logs on building high-density web scrapers for consumer electronics stores. Bypassing JA3 WAF headers, thread optimization, and compiling datasets for AI model training." },
    { name: "keywords", content: "electronics store dataset, JA3 evasion web scraping, scraping concurrent architecture, AI model training retail data" },
    
    // OpenGraph
    { property: "og:title", content: "ScrapCTL | Engineering Chronicles: Scraping Electronics Store Data" },
    { property: "og:description", content: "Read the developer journey of building high-density scrapers to extract pricing data and specifications from tech store portals." },
    { property: "og:type", content: "article" },
    
    // AI Chatbot / Search Engine Optimization (GEO)
    { name: "ai-agent-index", content: "index, follow" },
    { name: "ai-content-summary", content: "An in-depth developer chronicle detailing how we designed a concurrent scraping orchestrator to build high-density electronics product datasets. Discusses bypass methods for JA3 TLS fingerprinting, HTTP/2 ALPN header order mapping, and storing structured specs for AI model training." }
  ];
}

export default function BlogPage() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const articleRef = useRef<HTMLElement>(null);

  // 1. Extract headings and slugs on mount
  useEffect(() => {
    if (!articleRef.current) return;

    // Find all H2 and H3 elements within the article
    const headingElements = Array.from(articleRef.current.querySelectorAll("h2, h3"));
    
    const items = headingElements.map((el) => {
      const text = el.textContent || "";
      // Generate clean slug
      const id = el.id || text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      // Assign ID to heading element for anchor scrolling
      el.id = id;

      return {
        id,
        text,
        level: el.tagName === "H2" ? 2 : 3,
      };
    });

    setHeadings(items);
  }, []);

  // 2. Scrollspy listener on the scrollable article container
  useEffect(() => {
    const articleContainer = articleRef.current;
    if (!articleContainer || headings.length === 0) return;

    const handleScroll = () => {
      const headingElements = Array.from(articleContainer.querySelectorAll("h2, h3"));
      if (headingElements.length === 0) return;

      const articleRect = articleContainer.getBoundingClientRect();
      let currentActive = headingElements[0].id;

      for (const el of headingElements) {
        const rect = el.getBoundingClientRect();
        // If the heading top is above or near the top of the article container viewport
        if (rect.top <= articleRect.top + 40) {
          currentActive = el.id;
        } else {
          break; // Headings are ordered, so stop checking subsequent ones
        }
      }

      setActiveId(currentActive);
    };

    handleScroll(); // initial check
    articleContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Timeout fallback to ensure rendering is complete
    const timer = setTimeout(handleScroll, 100);

    return () => {
      articleContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      clearTimeout(timer);
    };
  }, [headings]);

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    const article = articleRef.current;
    if (element && article) {
      // Calculate scroll offset relative to the article container
      const targetOffset = element.offsetTop - 24;
      article.scrollTo({ top: targetOffset, behavior: "smooth" });
      setActiveId(id);
      // Update browser URL hash without jump-scrolling the whole page
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col gap-6">
      {/* Blog header card - brutalist style */}
      <div className="shrink-0 border-2 border-black p-5 bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:bg-[#151430] dark:border-[#38376b]">
        <div className="flex items-center gap-3 mb-2 text-xs font-mono font-bold text-primary uppercase tracking-widest">
          <BookOpen className="w-4 h-4" />
          <span>SYS_DOC_LOG // ARCHIVE_2026</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">Engineering Logs</h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold tracking-wider">
          Technical chronicles, architectural write-ups, and learning journey of ScrapCTL.
        </p>
      </div>

      {/* Main Page Layout - matching heights */}
      <div className="flex-1 flex flex-col xl:flex-row gap-8 min-h-0 min-w-0 relative items-start">
        
        {/* Table of Contents (TOC) Sub-Sidebar */}
        <aside className="w-full xl:w-80 shrink-0 bg-card border-2 border-black dark:border-[#38376b] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col h-full">
          <div className="p-4 border-b-2 border-border bg-background shrink-0">
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-muted-foreground">
              Document Index
            </span>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
            {headings.map((heading) => {
              const isActive = activeId === heading.id;
              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => handleHeadingClick(e, heading.id)}
                  className={`group flex items-start gap-2 py-1.5 text-xs font-bold transition-all duration-100 relative ${
                    heading.level === 3 ? "pl-5 text-[11px]" : "pl-2"
                  } ${
                    isActive
                      ? "text-primary font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {/* Left accent bar for active H2 */}
                  {isActive && heading.level === 2 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  
                  {/* Bullet symbol based on heading level */}
                  <span className="shrink-0 mt-0.5">
                    {heading.level === 3 ? (
                      <CornerDownRight className={`w-3 h-3 ${isActive ? "text-primary" : "text-muted-foreground/50"}`} />
                    ) : (
                      <ArrowRight className={`w-3.5 h-3.5 ${isActive ? "text-primary animate-pulse" : "text-muted-foreground/30 group-hover:text-muted-foreground"}`} />
                    )}
                  </span>
                  
                  <span className={heading.level === 2 ? "uppercase tracking-wider" : "normal-case font-medium"}>
                    {heading.text}
                  </span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Blog Content Pane - Scrollable container */}
        <article 
          ref={articleRef} 
          className="flex-1 h-full overflow-y-auto custom-scrollbar bg-background border-2 border-black dark:border-[#38376b] p-6 md:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] prose prose-sm dark:prose-invert md:prose-base max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:italic prose-h2:border-b-2 prose-h2:border-black dark:prose-h2:border-[#38376b] prose-h2:pb-2 prose-h2:mt-8 prose-h3:mt-6 prose-a:font-mono prose-a:text-primary prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-80"
        >
          <ScrapctlJourney />
        </article>

      </div>
    </div>
  );
}
