export default function Footer() {
    return (
        <footer className="w-full bg-card p-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary border-2 border-border flex items-center justify-center font-bold text-primary-foreground font-mono text-sm">
                        S
                    </div>
                    <span className="font-bold tracking-widest uppercase text-foreground text-sm">ScrapCTL <span className="text-primary ml-1">v2.0</span></span>
                </div>
                
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} shangkudev. All systems nominal.
                </div>

                <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <a href="#" className="hover:text-primary transition-colors">Documentation</a>
                    <a href="#" className="hover:text-primary transition-colors">Support</a>
                    <a href="#" className="hover:text-primary transition-colors">Telemetry</a>
                </div>
            </div>
        </footer>
    )
}