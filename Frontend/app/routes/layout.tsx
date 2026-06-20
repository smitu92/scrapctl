import { useState } from "react";
import Sidebar from "../layouts/sidebar/sidebar";
import Footer from "../layouts/footer/footer";
import { Outlet } from "react-router";
import { Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";

export default function Layout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b-2 border-border bg-card shrink-0">
                <div className="font-bold tracking-widest text-sm uppercase">ScrapCTL Console</div>
                <Button variant="outline" size="icon" className="rounded-none border-2 w-10 h-10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <aside className="w-64 border-r-2 border-border bg-card shrink-0 hidden md:block">
                    <Sidebar />
                </aside>

                {/* Mobile Sidebar Overlay */}
                {mobileMenuOpen && (
                    <div className="absolute inset-0 z-50 flex md:hidden h-full">
                        <aside className="w-64 border-r-2 border-border bg-card h-full shadow-2xl flex flex-col relative z-50">
                            <Sidebar />
                        </aside>
                        <div className="flex-1 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)} />
                    </div>
                )}

                <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-background min-w-0">
                    <Outlet />
                </main>
            </div>
            <div className="border-t-2 border-border bg-card">
                <Footer />
            </div>
        </div>
    )
}