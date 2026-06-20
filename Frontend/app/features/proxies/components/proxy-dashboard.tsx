import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import {
  Server, Zap, RefreshCw, Trash2, Plus, Globe,
  Upload, Settings2, CheckCircle2, Wifi, Activity,
  Terminal, Lock, Key, Sliders, ChevronRight, ShieldCheck
} from "lucide-react";
import api from "~/../axios";
import { useLocalProxies, type LocalProxy } from "../hooks/useLocalProxies";
import { DefaultPoolCard } from "./default-pool-card";
import { ProxyDetailPanel } from "./proxy-detail-panel";

const PATTERNS = [
  { id: "IP:PORT:USER:PASS", label: "Webshare / IP:Port:User:Pass" },
  { id: "USER:PASS:IP:PORT", label: "Standard / User:Pass:IP:Port" },
  { id: "IP:PORT", label: "No Auth / IP:Port" },
  { id: "USER:PASS@IP:PORT", label: "Standard URL / U:P@IP:P" },
];

const PROXY_MODES = [
  { id: "user", label: "My Proxies Only" },
  { id: "default", label: "Default Pool Only" },
  { id: "both", label: "Both Combined" },
];

const DEFAULT_TEST_URL = "https://www.croma.com/apple-iphone-17-pro-max-256gb-deep-blue-/p/317435";
const DEFAULT_AZURE_KEY = import.meta.env.VITE_CROMA_AZURE_KEY || "";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4321";

interface DefaultPoolStatus {
  active: number;
  total: number;
  last_tested?: string | null;
}

function parseProxyLine(line: string, pattern: string): LocalProxy | null {
  line = line.trim();
  if (!line) return null;
  try {
    let ip = "", port = "", username = "", password = "";

    if (line.includes("@")) {
      const [auth, addr] = line.split("@");
      const [u, p] = auth.split(":");
      const [i, po] = addr.split(":");
      username = u; password = p; ip = i; port = po;
    } else {
      const parts = line.split(":");
      const isIp = (s: string) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s);
      if (parts.length === 4) {
        if (isIp(parts[0])) {
          [ip, port, username, password] = parts;
        } else if (isIp(parts[2])) {
          [username, password, ip, port] = parts;
        } else if (pattern.includes("IP:PORT:USER:PASS")) {
          [ip, port, username, password] = parts;
        } else {
          [username, password, ip, port] = parts;
        }
      } else if (parts.length === 2) {
        [ip, port] = parts;
      }
    }

    if (!ip || !port) return null;
    return {
      id: `${ip}:${port}`,
      ip, port,
      username: username || undefined,
      password: password || undefined,
      protocol: "HTTP",
      status: "PENDING",
      raw_string: line
    };
  } catch {
    return null;
  }
}

export function ProxyDashboard() {
  const { proxies: userProxies, addBulk, updateProxy, removeProxy, clearAll } = useLocalProxies();

  const [defaultPool, setDefaultPool] = useState<DefaultPoolStatus>({ active: 0, total: 0 });
  const [loadingPool, setLoadingPool] = useState(true);

  const [selectedProxy, setSelectedProxy] = useState<LocalProxy | null>(null);
  const [pasteData, setPasteData] = useState("");
  const [selectedPattern, setSelectedPattern] = useState(PATTERNS[0].id);
  const [proxyMode, setProxyMode] = useState("both");
  const [testUrl, setTestUrl] = useState(DEFAULT_TEST_URL);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [azureKey, setAzureKey] = useState(DEFAULT_AZURE_KEY);
  const [customHeaders, setCustomHeaders] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const [manualProxy, setManualProxy] = useState({ ip: "", port: "", username: "", password: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load default pool status from backend
  useEffect(() => {
    api.get<DefaultPoolStatus>("/api/proxies").then(res => {
      setDefaultPool(res.data);
    }).catch(() => {}).finally(() => setLoadingPool(false));
  }, []);

  // WebSocket for proxy test updates
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/dashboard`);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000); };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "PROXY_TEST_START") setIsTesting(true);
          if (msg.type === "PROXY_TEST_COMPLETE") setIsTesting(false);
          if (msg.type === "PROXY_UPDATE") {
            const d = msg.data;
            const id = `${d.ip}:${d.port}`;
            updateProxy(id, { status: d.status, latency: d.latency, error_code: d.error_code, last_checked: d.last_checked });
          }
          if (msg.type === "DEFAULT_POOL_TEST_COMPLETE") {
            setDefaultPool(prev => ({ ...prev, active: msg.data.active, total: msg.data.total }));
          }
        } catch { /* ignore */ }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [updateProxy]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPasteData(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleCommitToFleet = () => {
    const lines = pasteData.split("\n").filter(l => l.trim());
    const parsed = lines
      .map(l => parseProxyLine(l, selectedPattern))
      .filter(Boolean) as LocalProxy[];
    if (parsed.length === 0) return;
    addBulk(parsed);
    setPasteData("");
  };

  const handleAddManual = () => {
    if (!manualProxy.ip || !manualProxy.port) return;
    const raw = manualProxy.username && manualProxy.password
      ? `${manualProxy.ip}:${manualProxy.port}:${manualProxy.username}:${manualProxy.password}`
      : `${manualProxy.ip}:${manualProxy.port}`;
    const parsed = parseProxyLine(raw, "IP:PORT:USER:PASS");
    if (parsed) addBulk([parsed]);
    setManualProxy({ ip: "", port: "", username: "", password: "" });
  };

  const handleTestAll = async () => {
    if (userProxies.length === 0) return;
    setIsTesting(true);
    let parsedHeaders: Record<string, string> | null = null;
    if (customHeaders.trim()) {
      try { parsedHeaders = JSON.parse(customHeaders); }
      catch { alert("Invalid JSON in headers"); setIsTesting(false); return; }
    }
    try {
      await api.post("/api/proxies/test", {
        proxies: userProxies.map(p => p.raw_string),
        pattern: selectedPattern,
        test_url: testUrl,
        timeout_ms: timeoutMs,
        azure_key: azureKey,
        headers: parsedHeaders
      });
    } catch {
      alert("Test failed");
      setIsTesting(false);
    }
  };

  const handleDropAll = () => {
    if (!confirm("Drop all YOUR proxies? Default pool is not affected.")) return;
    clearAll();
  };

  const activeCount = userProxies.filter(p => p.status === "ACTIVE").length;
  const deadCount = userProxies.filter(p => p.status === "DEAD").length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-8">
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground bg-black/5 px-2 py-1 w-fit">
            MOD_03 // NETWORK_ROUTING
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase italic flex items-baseline gap-4">
            Proxy Manager
            <span className="text-sm font-mono not-italic font-bold text-muted-foreground tracking-widest border-l-4 border-black pl-4">
              SYS_STATUS: {wsConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 px-6 py-3 border-4 border-black ${wsConnected ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
            <div className={`w-3 h-3 rounded-none ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {wsConnected ? "WS_LINK_ESTABLISHED" : "WS_LINK_INTERRUPTED"}
            </span>
          </div>
          {isTesting && (
            <div className="flex items-center gap-3 px-6 py-3 border-4 border-black bg-primary/10">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">VALIDATING_NODES...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">

          {/* Ingest Port */}
          <div className="border-4 border-black rounded-none shadow-[10px_10px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <div className="bg-black text-white px-6 py-3 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                <Upload className="w-4 h-4" /> Ingest_Port
              </h3>
              <span className="text-[10px] font-mono opacity-60">ID: UPL-01</span>
            </div>
            <div className="p-8 space-y-6">
              <div
                className="border-4 border-dashed border-black/20 bg-black/5 h-48 flex flex-col items-center justify-center gap-4 hover:border-black/40 transition-all cursor-pointer group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {pasteData ? (
                  <div className="text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <div className="text-xs font-black uppercase">{pasteData.split("\n").filter(l => l.trim()).length} Nodes Buffered</div>
                    <button className="mt-3 text-[10px] font-black uppercase underline" onClick={e => { e.stopPropagation(); setPasteData(""); }}>Clear</button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black uppercase italic">Bulk Upload</div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase mt-1">Drag & Drop Secure Files</div>
                    </div>
                    <div className="px-4 py-1 bg-white border-2 border-black text-[9px] font-mono font-bold uppercase">
                      Format: IP:PORT:USER:PASS
                    </div>
                  </>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Parsing Pattern</div>
                <Select value={selectedPattern} onValueChange={setSelectedPattern}>
                  <SelectTrigger className="rounded-none border-4 border-black h-12 font-mono text-xs uppercase bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-black font-mono">
                    {PATTERNS.map(p => (
                      <SelectItem key={p.id} value={p.id} className="uppercase text-[10px] font-bold">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-16 rounded-none bg-[#FFB800] hover:bg-[#E6A600] text-black font-black uppercase text-lg italic tracking-tighter shadow-[8px_8px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                onClick={handleCommitToFleet}
                disabled={!pasteData}
              >
                Commit to Fleet
              </Button>
            </div>
          </div>

          {/* Diagnostic Suite */}
          <div className="border-4 border-black rounded-none shadow-[10px_10px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <div className="bg-black text-white px-6 py-3 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Diagnostic_Suite
              </h3>
              <span className="text-[9px] font-mono opacity-60">USER PROXIES</span>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Target_URL
                </label>
                <div className="flex items-center gap-3 px-3 border-4 border-black bg-black/5 h-12">
                  <span className="text-muted-foreground font-mono font-bold">{">"}</span>
                  <Input value={testUrl} onChange={e => setTestUrl(e.target.value)} className="border-none bg-transparent h-10 text-[11px] font-mono focus-visible:ring-0 p-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Timeout_MS</label>
                  <div className="flex items-center px-3 border-4 border-black bg-black/5 h-12">
                    <Input type="number" value={timeoutMs} onChange={e => setTimeoutMs(Number(e.target.value))} className="border-none bg-transparent h-10 text-[11px] font-mono focus-visible:ring-0 p-0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Azure_Key</label>
                  <div className="flex items-center px-3 border-4 border-black bg-black/5 h-12">
                    <Input type="password" value={azureKey} onChange={e => setAzureKey(e.target.value)} className="border-none bg-transparent h-10 text-[11px] font-mono focus-visible:ring-0 p-0" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Custom_Headers_JSON
                </label>
                <textarea
                  className="w-full h-24 p-4 bg-black/5 border-4 border-black font-mono text-[10px] focus:outline-none focus:bg-black/10 resize-none"
                  placeholder='{ "X-Custom": "Value" }'
                  value={customHeaders}
                  onChange={e => setCustomHeaders(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                className="w-full h-14 rounded-none border-4 border-black bg-white hover:bg-black hover:text-white text-black font-black uppercase text-sm tracking-widest shadow-[8px_8px_0px_rgba(0,0,0,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 gap-3"
                onClick={handleTestAll}
                disabled={isTesting || userProxies.length === 0}
              >
                {isTesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                Test My Proxies
              </Button>
            </div>
          </div>

          {/* Proxy Mode Selector */}
          <div className="border-4 border-black rounded-none shadow-[10px_10px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <div className="bg-black text-white px-6 py-3">
              <h3 className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Scraping_Proxy_Mode
              </h3>
            </div>
            <div className="p-6 space-y-2">
              {PROXY_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setProxyMode(m.id)}
                  className={`w-full text-left px-4 py-3 border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between ${
                    proxyMode === m.id
                      ? "border-black bg-black text-white"
                      : "border-black/20 bg-white hover:border-black"
                  }`}
                >
                  {m.label}
                  {proxyMode === m.id && <ChevronRight className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* Manual Override */}
          <div className="border-4 border-black rounded-none shadow-[10px_10px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <div className="bg-black text-white px-6 py-3 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Manual_Override_Matrix
              </h3>
              <span className="text-[10px] font-mono opacity-60">ID: MAN-03</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-2 items-center">
                <Input placeholder="IP" className="rounded-none border-2 border-black h-10 font-mono text-xs" value={manualProxy.ip} onChange={e => setManualProxy({ ...manualProxy, ip: e.target.value })} />
                <Input placeholder="Port" className="rounded-none border-2 border-black h-10 font-mono text-xs" value={manualProxy.port} onChange={e => setManualProxy({ ...manualProxy, port: e.target.value })} />
                <Input placeholder="Username" className="rounded-none border-2 border-black h-10 font-mono text-xs" value={manualProxy.username} onChange={e => setManualProxy({ ...manualProxy, username: e.target.value })} />
                <Input type="password" placeholder="Password" className="rounded-none border-2 border-black h-10 font-mono text-xs" value={manualProxy.password} onChange={e => setManualProxy({ ...manualProxy, password: e.target.value })} />
                <Button size="icon" className="h-10 w-full rounded-none bg-black text-white hover:bg-black/80" onClick={handleAddManual}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Live Routing Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Live_Routing_Table</h2>
                <Badge className="rounded-none bg-black text-white font-mono text-[10px] px-3 py-1">
                  TOTAL: {userProxies.length}
                </Badge>
                {activeCount > 0 && (
                  <Badge className="rounded-none bg-emerald-500 text-white font-mono text-[10px] px-3 py-1">
                    {activeCount} ACTIVE
                  </Badge>
                )}
                {deadCount > 0 && (
                  <Badge className="rounded-none bg-destructive text-white font-mono text-[10px] px-3 py-1">
                    {deadCount} DEAD
                  </Badge>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-none font-black uppercase text-[9px] tracking-widest h-7 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-[-4px] translate-y-[-4px] hover:translate-x-0 hover:translate-y-0 transition-all"
                onClick={handleDropAll}
                disabled={userProxies.length === 0}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Drop_My_Proxies
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Default Pool Card - always first */}
              {!loadingPool && (
                <DefaultPoolCard initial={defaultPool} />
              )}

              {/* User Proxy Cards */}
              {userProxies.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProxy(p)}
                  className={`border-4 rounded-none transition-all duration-300 relative group overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,0.15)] ${
                    p.status === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[6px_6px_0px_rgba(16,185,129,0.2)]"
                      : p.status === "DEAD"
                      ? "border-destructive bg-destructive/[0.03] shadow-[6px_6px_0px_rgba(239,68,68,0.2)]"
                      : "border-black/10 bg-white shadow-[6px_6px_0px_rgba(0,0,0,0.05)]"
                  }`}
                >
                  {/* Latency badge */}
                  <div className="absolute top-0 right-0">
                    {p.latency ? (
                      <div className="bg-emerald-500 text-white text-[9px] font-black px-3 py-1 italic">
                        {Math.round(p.latency * 1000)}ms
                      </div>
                    ) : p.error_code ? (
                      <div className="bg-destructive text-white text-[9px] font-black px-3 py-1 italic uppercase">
                        ERR_{p.error_code}
                      </div>
                    ) : null}
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <div className="text-[13px] font-black font-mono text-black truncate">{p.ip}:{p.port}</div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        LOC: UNKNOWN // {p.protocol}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t-2 border-black/5">
                      <div className="flex gap-2">
                        {p.username && (
                          <Badge variant="outline" className="rounded-none text-[8px] font-black border-blue-500 text-blue-500 py-0 h-4">
                            SECURED
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`rounded-none text-[8px] font-black py-0 h-4 ${
                            p.status === "ACTIVE" ? "border-emerald-500 text-emerald-500" : "border-black/20 text-muted-foreground"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 text-destructive"
                          onClick={e => { e.stopPropagation(); removeProxy(p.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[8px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Terminal className="w-2.5 h-2.5" /> Click to open diagnostic panel
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {userProxies.length === 0 && (
                <div className="col-span-full border-4 border-dashed border-black/10 py-20 flex flex-col items-center justify-center opacity-30 grayscale">
                  <Server className="w-20 h-20 mb-4" />
                  <div className="text-sm font-black uppercase tracking-[0.4em]">Node_Fleet_Empty</div>
                  <div className="text-[10px] font-mono mt-2 uppercase">Upload proxies and commit to fleet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proxy Detail Panel (modal) */}
      {selectedProxy && (
        <ProxyDetailPanel
          proxy={selectedProxy}
          onClose={() => setSelectedProxy(null)}
          onUpdate={updateProxy}
          wsUrl={`${WS_URL}/ws/dashboard`}
        />
      )}
    </div>
  );
}
