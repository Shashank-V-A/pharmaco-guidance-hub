import { Link, useLocation } from "react-router-dom";
import { Home, FlaskConical, BarChart3, FileText } from "lucide-react";

const sidebarItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FlaskConical, label: "Analysis", path: "/analysis" },
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: FileText, label: "Reports", path: "/results" },
];

export function SidebarNav() {
  const location = useLocation();

  return (
    <aside className="hidden w-16 flex-col items-center border-r border-border bg-card py-4 lg:flex">
      {sidebarItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            title={item.label}
            className={`mb-1 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-in-out ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-[18px] w-[18px]" />
          </Link>
        );
      })}
    </aside>
  );
}
