import { LayoutDashboard, Database, FolderKanban, Calendar, Cpu, ShieldCheck, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router";

export default function Sidebar() {
    const location = useLocation();

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/launcher' },
        { label: 'Nodes', icon: <Cpu className="w-5 h-5" />, href: '/monitor' },
        { label: 'Proxy Manager', icon: <Database className="w-5 h-5" />, href: '/proxies' },
        { label: 'Projects', icon: <FolderKanban className="w-5 h-5" />, href: '/projects' },
        { label: 'Scheduler', icon: <Calendar className="w-5 h-5" />, href: '/settings' },
        { label: 'Blog', icon: <BookOpen className="w-5 h-5" />, href: '/blog' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#F5F5F5] text-[#1A1A1A] border-r-4 border-black">
            {/* Sidebar Header */}
            <div className="p-6 border-b-4 border-black bg-white">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">ScrapCTL_Core</h2>
                    <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" />
                        SYS_REF: 0x442-B
                    </div>
                </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 py-4">
                {navItems.map((item) => {
                    const active = location.pathname === item.href || (item.href === '/blog' && location.pathname === '/blogs');
                    return (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={`w-full flex items-center gap-4 px-8 py-5 transition-all duration-100 group relative ${
                                active 
                                    ? 'bg-[#FFB800] text-black font-black' 
                                    : 'hover:bg-black/5 text-muted-foreground'
                            }`}
                        >
                            {/* Active Indicator Bar */}
                            {active && <div className="absolute left-0 top-0 bottom-0 w-2 bg-black" />}
                            
                            <span className={`${active ? 'text-black' : 'group-hover:text-black'}`}>
                                {item.icon}
                            </span>
                            <span className={`text-xs font-black uppercase tracking-[0.2em]`}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            {/* Sidebar Footer */}
            <div className="mt-auto border-t-4 border-black p-4 bg-white">
                <div className="flex items-center gap-4 px-2 py-2 border-2 border-black/10">
                    <div className="w-12 h-12 bg-black flex items-center justify-center text-white shrink-0 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-widest truncate">Op_Sys_Admin</div>
                        <div className="text-[9px] font-mono text-muted-foreground uppercase font-bold">Auth_Level: Maximum</div>
                    </div>
                </div>
            </div>
        </div>
    )
}