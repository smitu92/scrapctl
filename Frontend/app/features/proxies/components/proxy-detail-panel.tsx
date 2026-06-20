import { useState, useEffect, useRef } from "react";
import { X, Globe, Clock, Key, Terminal, Activity, RefreshCw, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { Input } from "~/components/ui/input";
import type { LocalProxy } from "../hooks/useLocalProxies";
import api from "~/../axios";

const DEFAULT_TEST_URL = "https://www.croma.com/apple-iphone-17-pro-max-256gb-deep-blue-/p/317435";
const DEFAULT_AZURE_KEY = import.meta.env.VITE_CROMA_AZURE_KEY || "";

const formatBrowserTime = (isoString?: string | null) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString();
  } catch {
    return isoString;
  }
};

interface TestResult {
  status: string;
  latency?: number;
  error_code?: number;
  last_checked?: string;
}

interface Props {
  proxy: LocalProxy;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<LocalProxy>) => void;
  wsUrl: string;
}

export function ProxyDetailPanel({ proxy, onClose, onUpdate, wsUrl }: Props) {
  const [testUrl, setTestUrl] = useState(DEFAULT_TEST_URL);
  const [azureKey, setAzureKey] = useState(DEFAULT_AZURE_KEY);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [customHeaders, setCustomHeaders] = useState("");
  const [pattern, setPattern] = useState("IP:PORT:USER:PASS");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Listen for WS updates for this proxy
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "PROXY_UPDATE" && msg.data.ip === proxy.ip && msg.data.port === proxy.port) {
          const data = msg.data;
          setResult({ status: data.status, latency: data.latency, error_code: data.error_code, last_checked: data.last_checked });
          onUpdate(proxy.id, { status: data.status, latency: data.latency, error_code: data.error_code, last_checked: data.last_checked });
          setTesting(false);
        }
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [proxy.id, proxy.ip, proxy.port, wsUrl, onUpdate]);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    let parsedHeaders: Record<string, string> | null = null;
    if (customHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(customHeaders);
      } catch {
        alert("Invalid JSON in headers");
        setTesting(false);
        return;
      }
    }

    try {
      const res = await api.post("/api/proxies/test", {
        proxies: [proxy.raw_string],
        pattern,
        test_url: testUrl,
        timeout_ms: timeoutMs,
        azure_key: azureKey,
        headers: parsedHeaders
      });
      const r = res.data.results?.[0];
      if (r) {
        setResult({ status: r.status, latency: r.latency, error_code: r.error_code, last_checked: r.last_checked });
        onUpdate(proxy.id, { status: r.status, latency: r.latency, error_code: r.error_code, last_checked: r.last_checked });
      }
    } catch {
      alert("Test failed");
    } finally {
      setTesting(false);
    }
  };

  const statusColor = result?.status === "ACTIVE" ? "text-emerald-500" : result?.status === "DEAD" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border-4 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] mx-4">
        {/* Header */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono opacity-60 uppercase tracking-widest">Proxy Diagnostic Terminal</div>
            <div className="text-sm font-black font-mono mt-1">{proxy.ip}:{proxy.port}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Result badge */}
          {result && (
            <div className={`flex items-center gap-3 p-4 border-4 ${result.status === "ACTIVE" ? "border-emerald-500 bg-emerald-500/10" : "border-destructive bg-destructive/10"}`}>
              {result.status === "ACTIVE"
                ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                : <XCircle className="w-6 h-6 text-destructive" />
              }
              <div>
                <div className={`text-sm font-black uppercase ${statusColor}`}>{result.status}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {result.latency ? `${Math.round(result.latency * 1000)}ms` : "—"}
                  {result.error_code ? ` · HTTP ${result.error_code}` : ""}
                  {result.last_checked ? ` · ${formatBrowserTime(result.last_checked)}` : ""}
                </div>
              </div>
            </div>
          )}

          {/* Proxy info */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-black/5 p-3 border-2 border-black/10">
            <div><span className="text-muted-foreground">IP: </span>{proxy.ip}</div>
            <div><span className="text-muted-foreground">PORT: </span>{proxy.port}</div>
            {proxy.username && <div><span className="text-muted-foreground">USER: </span>{proxy.username}</div>}
            {proxy.password && <div><span className="text-muted-foreground">PASS: </span>{"*".repeat(proxy.password.length)}</div>}
          </div>

          {/* Test URL */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Target URL
            </label>
            <div className="flex items-center gap-2 px-3 border-4 border-black bg-black/5 h-10">
              <span className="text-muted-foreground font-mono font-bold text-sm">{">"}</span>
              <Input
                value={testUrl}
                onChange={e => setTestUrl(e.target.value)}
                className="border-none bg-transparent h-8 text-[11px] font-mono focus-visible:ring-0 p-0"
              />
            </div>
          </div>

          {/* Timeout + Azure Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Timeout MS
              </label>
              <div className="flex items-center gap-2 px-3 border-4 border-black bg-black/5 h-10">
                <Input
                  type="number"
                  value={timeoutMs}
                  onChange={e => setTimeoutMs(Number(e.target.value))}
                  className="border-none bg-transparent h-8 text-[11px] font-mono focus-visible:ring-0 p-0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Key className="w-3 h-3" /> Azure Key
              </label>
              <div className="flex items-center gap-2 px-3 border-4 border-black bg-black/5 h-10">
                <Input
                  type="password"
                  value={azureKey}
                  onChange={e => setAzureKey(e.target.value)}
                  className="border-none bg-transparent h-8 text-[11px] font-mono focus-visible:ring-0 p-0"
                />
              </div>
            </div>
          </div>

          {/* Custom Headers */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Terminal className="w-3 h-3" /> Custom Headers (JSON)
            </label>
            <textarea
              className="w-full h-20 p-3 bg-black/5 border-4 border-black font-mono text-[10px] focus:outline-none focus:bg-black/10 resize-none"
              placeholder='{ "X-Custom": "Value" }'
              value={customHeaders}
              onChange={e => setCustomHeaders(e.target.value)}
            />
          </div>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full h-12 flex items-center justify-center gap-3 bg-black text-white hover:bg-black/80 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-[6px_6px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            {testing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing via WebSocket...</>
              : <><Activity className="w-4 h-4" /> Run Diagnostic</>
            }
          </button>

          {testing && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
              <Wifi className="w-3 h-3 animate-pulse" />
              Streaming result via WebSocket...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
