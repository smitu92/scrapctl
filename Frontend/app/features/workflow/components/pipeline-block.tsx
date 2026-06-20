import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"

interface PipelineBlockProps {
  id: string;
  title: string;
  state: 'PENDING' | 'RUNNING' | 'WAITING_FOR_USER' | 'COMPLETED';
  stats?: { success: number; fail: number };
  onInteract?: () => void;
  logs?: any[];
}

export function PipelineBlock({ title, state, stats, onInteract, logs = [] }: PipelineBlockProps) {
  
  // Theme logic based on block state
  const stateTheme = {
    PENDING: {
      border: 'border-border',
      bg: 'bg-card',
      text: 'text-muted-foreground',
      badge: 'bg-muted text-muted-foreground',
      icon: '⏸',
    },
    RUNNING: {
      border: 'border-primary',
      bg: 'bg-background',
      text: 'text-foreground',
      badge: 'bg-primary text-primary-foreground animate-pulse',
      icon: '⚙️',
    },
    WAITING_FOR_USER: {
      border: 'border-blue-500',
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      badge: 'bg-blue-500 text-white',
      icon: '👤',
    },
    COMPLETED: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-500/5',
      text: 'text-emerald-500',
      badge: 'bg-emerald-500 text-white',
      icon: '✅',
    }
  }[state];

  return (
    <Card className={`border-2 rounded-none transition-all duration-300 ${stateTheme.border} ${stateTheme.bg}`}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className={`text-lg font-bold uppercase tracking-widest flex items-center gap-2 ${stateTheme.text}`}>
          <span className="font-mono">{stateTheme.icon}</span> {title}
        </CardTitle>
        <Badge className={`rounded-none font-mono tracking-widest uppercase ${stateTheme.badge}`}>
          {state}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics Row (If running or completed) */}
        {(state === 'RUNNING' || state === 'COMPLETED') && stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-border bg-background p-3 text-center">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Success</div>
              <div className="text-2xl font-mono text-primary">{stats.success}</div>
            </div>
            <div className="border-2 border-border bg-background p-3 text-center">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Failed</div>
              <div className="text-2xl font-mono text-destructive">{stats.fail}</div>
            </div>
          </div>
        )}

        {/* Mini Terminal Logs for Running state */}
        {state === 'RUNNING' && (
          <div className="border-2 border-border bg-card p-2 h-32 overflow-y-auto font-mono text-xs">
            {logs.length === 0 && <div className="text-muted-foreground">Awaiting telemetry...</div>}
            {logs.map((log, i) => (
              <div key={i} className="mb-1 border-b border-border/50 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">[{new Date().toISOString().split('T')[1].split('.')[0]}]</span>
                  <span className={
                    log.status === 'SUCCESS' ? 'text-emerald-500' : 
                    log.status === 'SOFT_FAIL' ? 'text-primary' : 
                    log.status === 'HARD_FAIL' ? 'text-destructive' : 'text-foreground'
                  }>[{log.worker_id}] {log.status}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate ml-4">
                  {log.task_id}
                </div>
                {log.metadata?.proxy_used && (
                  <div className="text-[10px] text-blue-400 font-bold ml-4">
                    PROXY: {log.metadata.proxy_used.split('@').pop() || log.metadata.proxy_used}
                  </div>
                )}
                {log.error && (
                   <div className="text-[10px] text-destructive/80 italic ml-4">
                     ERROR: {log.error.message}
                   </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Interaction requirement for human-in-the-loop */}
        {state === 'WAITING_FOR_USER' && (
          <div className="border-2 border-blue-500 bg-background p-6 flex flex-col items-center text-center gap-4">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-500">
              User Interaction Required to Proceed
            </p>
            <Button onClick={onInteract} className="rounded-none bg-blue-500 hover:bg-blue-600 text-white font-bold tracking-widest">
              REVIEW DATA & MAP COLUMNS
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
