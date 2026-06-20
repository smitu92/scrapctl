import { useState } from "react";
import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import api from "~/../axios";

interface DefaultPoolStatus {
  active: number;
  total: number;
  last_tested?: string | null;
}

interface Props {
  initial: DefaultPoolStatus;
}

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

export function DefaultPoolCard({ initial }: Props) {
  const [pool, setPool] = useState<DefaultPoolStatus>(initial);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.post<DefaultPoolStatus>("/api/proxies/test-defaults");
      setPool(res.data);
    } catch {
      // silent fail — keep existing count
    } finally {
      setTesting(false);
    }
  };

  const pct = pool.total > 0 ? Math.round((pool.active / pool.total) * 100) : 0;
  const isHealthy = pool.active > pool.total / 2;

  return (
    <div
      className={`border-4 rounded-none transition-all duration-300 relative overflow-hidden ${
        pool.total === 0
          ? "border-black/10 bg-white"
          : isHealthy
          ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[6px_6px_0px_rgba(16,185,129,0.2)]"
          : "border-amber-500 bg-amber-500/[0.03] shadow-[6px_6px_0px_rgba(245,158,11,0.2)]"
      }`}
    >
      {/* Header bar */}
      <div className="bg-black text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Default Pool</span>
        </div>
        <span className="text-[8px] font-mono opacity-60">MANAGED</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Count display */}
        <div className="text-center">
          <div className="text-5xl font-black font-mono tracking-tighter">
            {pool.active}
            <span className="text-xl text-muted-foreground">/{pool.total}</span>
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mt-1">
            Active Nodes
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-black/10 rounded-none overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {pool.last_tested && (
          <div className="text-[8px] font-mono text-center text-muted-foreground truncate">
            Last tested: {formatBrowserTime(pool.last_tested)}
          </div>
        )}

        {/* Test button */}
        <button
          onClick={handleTest}
          disabled={testing}
          className="w-full h-9 flex items-center justify-center gap-2 border-2 border-black bg-white hover:bg-black hover:text-white font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {testing ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> Testing...</>
          ) : (
            <><Activity className="w-3 h-3" /> Test Pool</>
          )}
        </button>
      </div>
    </div>
  );
}
