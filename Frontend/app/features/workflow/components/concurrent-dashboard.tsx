import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

import { useSearchParams } from "react-router";
import { useWorkflowSocket } from "../hooks/useWorkflowSocket";
import type { DashboardEvent } from "../hooks/useWorkflowSocket";
import api from "~/../axios";

export function ConcurrentDashboard() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || undefined;

  const { isConnected, logs, stats, batchSummary } = useWorkflowSocket(sessionId);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Derive active threads from logs
  const activeThreadsMap = new Map<string, DashboardEvent>();
  [...logs].reverse().forEach(log => {
    if (log.worker_id && log.worker_id !== "MANAGER") {
      activeThreadsMap.set(log.worker_id, log);
    }
  });

  const threads = Array.from(activeThreadsMap.values()).map((log) => {
    let color = "bg-primary";
    let textCol = "text-primary";
    if (log.status === "SUCCESS") { color = "bg-emerald-500"; textCol = "text-foreground"; }
    else if (log.status === "HARD_FAIL") { color = "bg-destructive"; textCol = "text-destructive"; }
    else if (log.status === "SOFT_FAIL") { color = "bg-orange-500"; textCol = "text-orange-500"; }
    else if (log.status === "STARTED") { color = "bg-blue-500 animate-pulse"; textCol = "text-blue-500"; }

    return {
      id: log.worker_id,
      status: log.status,
      latency: log.metadata?.latency_seconds ? `${log.metadata.latency_seconds.toFixed(2)}s` : "-",
      target: String(log.task_id || "Waiting..."),
      color,
      textCol,
    };
  });

  const handleShowResults = async () => {
    if (!batchSummary?.output_file) return;
    try {
      const res = await api.get(`/api/task/result?file_path=${batchSummary.output_file}`);
      let data = res.data;
      if (Array.isArray(data) && data.length > 0 && data[0].result) {
        data = data.flatMap((item: any) => {
           if (Array.isArray(item.result)) return item.result;
           return [item.result];
        });
      }
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (err) {
      alert("Failed to load results file.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px] mx-auto h-[calc(100vh-140px)] animate-in fade-in duration-300">
      {/* Left Canvas */}
      <div className="flex-1 flex flex-col gap-6 min-w-0 overflow-hidden">
        {/* Thread Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 shrink-0">
          {threads.length > 0 ? threads.map((thread) => (
            <Card key={thread.id} className="min-w-[220px] flex-1 border-2 rounded-none flex flex-col shadow-none">
              <div className="bg-card px-3 py-2 border-b-2 border-border flex justify-between items-center">
                <span className="font-bold text-[10px] uppercase tracking-widest">{thread.id}</span>
                <span className={`w-3 h-3 ${thread.color} border-2 border-border`}></span>
              </div>
              <CardContent className="p-3 flex-1 flex flex-col gap-2 bg-background">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-muted-foreground uppercase">Status</span>
                  <span className={`font-bold ${thread.textCol}`}>{thread.status}</span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-muted-foreground uppercase">Latency</span>
                  <span className="font-bold">{thread.latency}</span>
                </div>
                <div className="mt-2 bg-muted/50 p-2 border border-border overflow-hidden">
                  <div className={`font-mono text-[9px] truncate`}>
                    {thread.target}
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="flex-1 border-2 border-dashed border-border p-8 text-center bg-muted/5">
               <p className="text-xs uppercase font-bold tracking-widest opacity-30 italic">Awaiting worker initialization...</p>
            </div>
          )}
        </div>

        {/* Terminal Table */}
        <Card className="flex-1 border-2 rounded-none shadow-none flex flex-col min-h-0 bg-background">
          <div className="flex bg-card border-b-2 border-border shrink-0 items-center justify-between pr-4">
            <div className="flex">
              <div className="px-6 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground border-r-2 border-border">
                Live Payloads
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
               <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{isConnected ? 'Link_Active' : 'Link_Offline'}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-card sticky top-0 border-b-2 border-border z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Session_Task_ID</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Worker</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold text-right">Data_Snapshot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.filter(l => l.worker_id !== "MANAGER").map((log, i) => (
                  <TableRow key={i} className="border-b border-border hover:bg-muted/50 font-mono text-[10px]">
                    <TableCell className="font-bold text-primary">{log.task_id}</TableCell>
                    <TableCell className="opacity-50">{log.worker_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-none text-[9px] px-1 py-0 ${
                        log.status === 'SUCCESS' ? 'border-emerald-500 text-emerald-500' :
                        log.status === 'HARD_FAIL' ? 'border-destructive text-destructive' :
                        log.status === 'SOFT_FAIL' ? 'border-orange-500 text-orange-500' : ''
                      }`}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right italic opacity-70">
                       {log.status === 'SUCCESS' ? 'PACKET_SAVED' : log.error?.message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Right Sidebar (Telemetry) */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-1">
        <Card className="border-2 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-background">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black text-muted-foreground mb-6 uppercase tracking-[0.2em] flex justify-between border-b border-border pb-2">
              Telemetery_Stats
              <span>V2.0</span>
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Processed</span>
                <span className="text-3xl font-mono font-black italic">{stats.success + stats.hardFails}</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-emerald-500/5 border-2 border-emerald-500 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 opacity-10"><span className="text-2xl font-black">OK</span></div>
                  <span className="block font-mono text-[9px] uppercase font-bold text-emerald-500 mb-1">Successful_Runs</span>
                  <span className="block text-2xl font-mono font-black text-emerald-500">{stats.success}</span>
                </div>
                <div className="bg-destructive/5 border-2 border-destructive p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 opacity-10"><span className="text-2xl font-black">!!</span></div>
                  <span className="block font-mono text-[9px] uppercase font-bold text-destructive mb-1">Hard_Failures</span>
                  <span className="block text-2xl font-mono font-black text-destructive">{stats.hardFails}</span>
                </div>
                <div className="bg-orange-500/5 border-2 border-orange-500 p-4">
                  <span className="block font-mono text-[9px] uppercase font-bold text-orange-500 mb-1">Soft_Retries</span>
                  <span className="block text-2xl font-mono font-black text-orange-500">{stats.softFails}</span>
                </div>
              </div>

              {!batchSummary && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (confirm("Are you sure you want to stop/cancel this scraping run?")) {
                      try {
                        await api.post(`/api/task/stop?session_id=${sessionId}`);
                        alert("Scraping cancellation requested.");
                      } catch (err: any) {
                        alert("Failed to cancel scraping: " + (err.response?.data?.detail || err.message));
                      }
                    }
                  }}
                  className="w-full rounded-none border-2 font-black tracking-widest gap-2 uppercase hover:bg-red-600 transition-all px-4 h-11"
                >
                  CANCEL_SCRAP
                </Button>
              )}
            </div>

          </CardContent>
        </Card>

        {/* COMPONENT MILESTONES (Category Completion) */}
        <Card className="border-2 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-background">
          <CardContent className="p-5">
            <h3 className="text-[10px] font-black text-muted-foreground mb-4 uppercase tracking-[0.2em] flex justify-between border-b border-border pb-2">
              Component_Milestones
            </h3>
            <div className="space-y-3">
               {logs.filter(l => l.status === "GROUP_COMPLETE").length === 0 && (
                 <p className="text-[10px] font-mono italic opacity-30 text-center py-4">No groups finalized yet...</p>
               )}
               {logs.filter(l => l.status === "GROUP_COMPLETE").map((log, i) => (
                 <div key={i} className="border-2 border-primary bg-primary/5 p-3 space-y-2 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] font-black uppercase tracking-tighter">{log.task_id}</span>
                       <Badge className="rounded-none bg-emerald-500 text-[8px] h-4">DONE</Badge>
                    </div>
                    <p className="text-[9px] font-mono opacity-70 leading-tight">
                       {log.summary?.message}
                    </p>
                    <div className="text-[8px] font-black text-primary opacity-50">
                       NODES_PROCESSED: {log.summary?.total_tasks}
                    </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {batchSummary && (
          <Card className="border-2 border-emerald-500 bg-emerald-500/10 rounded-none animate-bounce shadow-[4px_4px_0px_rgba(16,185,129,0.2)]">
             <CardContent className="p-5 space-y-4">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">✓ BATCH_JOB_COMPLETE</p>
                <p className="text-xs font-mono text-emerald-700">All tasks finalized. {batchSummary.success_count} success, {batchSummary.fail_count} failed.</p>
                <Button 
                  onClick={handleShowResults}
                  className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest text-xs h-10"
                >
                  VIEW_DATA_OUTPUT
                </Button>
             </CardContent>
          </Card>
        )}

        <div className="mt-auto border-2 border-border p-4 bg-muted/20">
           <p className="text-[9px] font-mono text-muted-foreground uppercase leading-relaxed">
             Session_ID: {sessionId || 'N/A'}<br/>
             Engine_v: ScrapCTL_Dumb_v2<br/>
             Status: {isConnected ? 'POLLING_SOCKET' : 'SOCKET_CLOSED'}
           </p>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col rounded-none border-2 border-border p-0 bg-background">
          <DialogHeader className="p-4 border-b-2 border-border bg-card shrink-0">
            <DialogTitle className="uppercase tracking-[0.2em] font-black italic text-lg">Execution_Data_Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {previewData.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-card border-b-2 border-border z-20">
                  <TableRow>
                    {Object.keys(previewData[0]).map((key) => (
                      <TableHead key={key} className="uppercase tracking-widest font-black text-[10px] text-primary">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i} className="border-b border-border hover:bg-muted/50 font-mono text-[10px]">
                      {Object.values(row).map((val: any, j) => (
                        <TableCell key={j} className="truncate max-w-[250px]">{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground font-mono italic">
                NO_RESULTS_FOUND_IN_BUFFER
              </div>
            )}
          </div>
          <div className="p-4 border-t-2 border-border bg-card shrink-0 flex justify-end">
            <Button className="rounded-none font-black tracking-widest bg-primary text-white" onClick={() => setIsPreviewOpen(false)}>
              CLOSE_PREVIEW
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
