import { useEffect, useRef } from "react";
import { useWorkflowStore, type DashboardEvent } from "../store/workflow-store";

export function useWorkflowSocket(sessionId?: string) {
  const { 
    isConnected, 
    setConnected, 
    addLog, 
    setBatchSummary, 
    logs, 
    stats, 
    batchSummary,
    setActiveSessionId 
  } = useWorkflowStore();

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    setActiveSessionId(sessionId);
    
    const wsUrl = `${import.meta.env.VITE_WS_URL || "ws://localhost:4321"}/ws/dashboard/${sessionId}`;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        return; // Already connected
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data: DashboardEvent = JSON.parse(event.data);
        
        if (data.status === "BATCH_COMPLETE") {
          setBatchSummary(data.summary);
        } else {
          addLog(data);
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    return () => {
      // Close the socket on unmount to prevent duplicate connections (which cause double logs)
      ws.close(); 
    };
  }, [sessionId, setConnected, addLog, setBatchSummary, setActiveSessionId]);

  return { isConnected, logs, stats, batchSummary };
}
export type { DashboardEvent };
