import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useWorkflowSocket } from "../hooks/useWorkflowSocket";
import { PipelineBlock } from "./pipeline-block";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import api from "~/../axios";

export function PipelineDashboard() {
  const [searchParams] = useSearchParams();
  const initialSession = searchParams.get("sessionId") || "";
  const [sessionId, setSessionId] = useState<string>(initialSession); 
  const { isConnected, logs, stats, batchSummary } = useWorkflowSocket(sessionId);

  const [workflowState, setWorkflowState] = useState({
    categories: 'PENDING' as const,
    mapping: 'PENDING' as const,
    products: 'PENDING' as const,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    if (batchSummary && batchSummary.output_file) {
      setWorkflowState(prev => ({ ...prev, categories: 'COMPLETED', mapping: 'WAITING_FOR_USER' }));
    }
  }, [batchSummary]);

  const startExtraction = async () => {
    try {
      const res = await api.post("/api/workflow/start", {
        workflow_name: "croma",
        output_path: "./output/test_run"
      });
      if (res.data.session_id) {
        setSessionId(res.data.session_id);
        setWorkflowState(prev => ({ ...prev, categories: 'RUNNING' as const }));
      }
    } catch (err) {
      console.error("Failed to start workflow", err);
      alert("Failed to start workflow!");
    }
  };

  const handleReviewData = async () => {
    if (!batchSummary?.output_file) return;
    try {
      const res = await api.get(`/api/files/read?file_path=${batchSummary.output_file}`);
      let data = res.data;
      
      // Auto-flatten if the data is wrapped in the backend's { task: 1, result: [...] } structure
      if (Array.isArray(data) && data.length > 0 && data[0].result && Array.isArray(data[0].result)) {
        // Flatten all result arrays into a single list
        data = data.flatMap((item: any) => item.result);
      }
      
      setTableData(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch batch output", err);
      alert("Could not load the extracted data file.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">Pipeline Monitor</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">SESSION_ID: {sessionId || "NOT_STARTED"}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={startExtraction} disabled={!!sessionId} className="rounded-none font-bold uppercase tracking-widest">
            Start Categories Extraction
          </Button>
          <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            SOCKET: 
            {isConnected ? (
              <Badge className="bg-emerald-500 text-white rounded-none">CONNECTED</Badge>
            ) : (
              <Badge variant="destructive" className="rounded-none">DISCONNECTED</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 relative">
        <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-border -z-10" />

        <div className="pl-14 relative">
          <div className={`absolute left-4 top-6 w-4 h-4 rounded-full border-2 bg-background ${workflowState.categories === 'COMPLETED' ? 'border-emerald-500' : 'border-primary'}`} />
          <PipelineBlock 
            id="cat" 
            title="Phase 1: Deep Category Scrape" 
            state={workflowState.categories} 
            stats={{ success: stats.success, fail: stats.hardFails }}
            logs={logs}
          />
        </div>

        <div className="pl-14 relative">
          <div className={`absolute left-4 top-6 w-4 h-4 rounded-full border-2 ${workflowState.mapping === 'WAITING_FOR_USER' ? 'border-blue-500 bg-blue-500/20 animate-pulse' : 'border-border bg-card'}`} />
          <PipelineBlock 
            id="map" 
            title="Phase 2: Data Review & Column Mapping" 
            state={workflowState.mapping} 
            onInteract={handleReviewData}
          />
        </div>

        <div className="pl-14 relative">
          <div className="absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-border bg-card" />
          <PipelineBlock 
            id="prod" 
            title="Phase 3: Deep Product Extraction" 
            state={workflowState.products} 
          />
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col rounded-none border-2 border-border p-0">
          <DialogHeader className="p-4 border-b-2 border-border bg-card shrink-0">
            <DialogTitle className="uppercase tracking-widest font-bold">Extracted Categories Review</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background p-4">
            {tableData.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-card border-b-2 border-border">
                  <TableRow>
                    {Object.keys(tableData[0]).map((key) => (
                      <TableHead key={key} className="uppercase tracking-widest font-bold text-xs">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, i) => (
                    <TableRow key={i} className="border-b border-border hover:bg-muted/50 font-mono text-xs">
                      {Object.values(row).map((val: any, j) => (
                        <TableCell key={j} className="truncate max-w-[200px]">{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground font-mono">
                No data structure found.
              </div>
            )}
          </div>
          <div className="p-4 border-t-2 border-border bg-card shrink-0 flex justify-end gap-4">
            <Button variant="outline" className="rounded-none font-bold tracking-widest" onClick={() => setIsModalOpen(false)}>
              CANCEL
            </Button>
            <Button className="rounded-none font-bold tracking-widest bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
              setIsModalOpen(false);
              setWorkflowState(prev => ({ ...prev, mapping: 'COMPLETED', products: 'RUNNING' }));
              alert("In a real flow, this would POST /api/workflow/{id}/resume");
            }}>
              APPROVE & MAP COLUMNS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
