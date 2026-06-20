import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WebSocketStatus = "STARTED" | "SOFT_FAIL" | "HARD_FAIL" | "SUCCESS" | "BATCH_COMPLETE" | "GROUP_COMPLETE" | "CONNECTED" | "DISCONNECTED";

export interface DashboardEvent {
  session_id: string;
  task_id: string;
  worker_id: string;
  status: WebSocketStatus;
  metadata?: any;
  error?: { message: string };
  summary?: { 
    output_file?: string; 
    success_count?: number; 
    fail_count?: number;
    message?: string;
    total_tasks?: number;
  };
}

interface WorkflowState {
  isConnected: boolean;
  logs: DashboardEvent[];
  stats: { success: number; hardFails: number; softFails: number };
  batchSummary: any | null;
  activeSessionId: string | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  addLog: (log: DashboardEvent) => void;
  setBatchSummary: (summary: any) => void;
  setActiveSessionId: (id: string | null) => void;
  resetStats: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      isConnected: false,
      logs: [],
      stats: { success: 0, hardFails: 0, softFails: 0 },
      batchSummary: null,
      activeSessionId: null,

      setConnected: (connected) => set({ isConnected: connected }),
      
      addLog: (log) => set((state) => {
        const newStats = { ...state.stats };
        if (log.status === "SUCCESS") newStats.success++;
        else if (log.status === "HARD_FAIL") newStats.hardFails++;
        else if (log.status === "SOFT_FAIL") newStats.softFails++;

        return {
          logs: [log, ...state.logs].slice(0, 200),
          stats: newStats
        };
      }),

      setBatchSummary: (summary) => set({ batchSummary: summary }),
      
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      
      resetStats: () => set({ 
        stats: { success: 0, hardFails: 0, softFails: 0 }, 
        logs: [], 
        batchSummary: null 
      }),
    }),
    {
      name: 'workflow-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
