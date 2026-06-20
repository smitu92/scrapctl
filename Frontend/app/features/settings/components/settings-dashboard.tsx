import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Save } from "lucide-react";

export function SettingsDashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global scraper limits, timeouts, and API keys.</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-2 rounded-none shadow-none">
          <CardHeader className="bg-card border-b-2 border-border rounded-none pb-4">
            <CardTitle className="uppercase flex items-center gap-2 text-lg">
              <span className="w-2 h-2 bg-primary inline-block" /> Global Engine Limits
            </CardTitle>
            <CardDescription>Default fallbacks when a specific job doesn't provide these arguments.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Max Retries</label>
                <Input type="number" defaultValue={3} className="rounded-none border-2 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Global Timeout (sec)</label>
                <Input type="number" defaultValue={30} className="rounded-none border-2 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Default Concurrency</label>
                <Input type="number" defaultValue={5} className="rounded-none border-2 font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-none shadow-none">
          <CardHeader className="bg-card border-b-2 border-border rounded-none pb-4">
            <CardTitle className="uppercase flex items-center gap-2 text-lg">
              <span className="w-2 h-2 bg-primary inline-block" /> External Integrations
            </CardTitle>
            <CardDescription>API Keys for Captcha solving or Notification systems.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex justify-between">
                  <span>2Captcha API Key</span>
                  <Badge variant="outline" className="rounded-none font-mono text-[10px]">OPTIONAL</Badge>
                </label>
                <Input type="password" placeholder="Enter key..." className="rounded-none border-2 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest flex justify-between">
                  <span>Webshare Proxy Token</span>
                  <Badge variant="outline" className="rounded-none font-mono text-[10px] bg-primary text-primary-foreground border-primary">ACTIVE</Badge>
                </label>
                <Input type="password" defaultValue="************************" className="rounded-none border-2 font-mono" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-card border-t-2 border-border p-6 flex justify-end">
            <Button className="rounded-none font-bold tracking-widest gap-2">
              <Save className="w-4 h-4" /> SAVE CONFIGURATION
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
