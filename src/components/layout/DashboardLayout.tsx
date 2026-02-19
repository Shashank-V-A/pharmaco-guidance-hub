import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { SidebarNav } from "./SidebarNav";
import { Footer } from "./Footer";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="flex flex-1">
        <SidebarNav />
        {children}
      </div>
      <Footer />
    </div>
  );
}
