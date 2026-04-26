import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, Home, LogOut, Tag, Users, BarChart3 } from "lucide-react";
import { useAuth } from "../lib/auth";

const navItems = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/crew", label: "Crew", icon: Users },
  { to: "/equipment", label: "Equipment", icon: Tag },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Layout() {
  const { logout } = useAuth();
  return (
    <div className="min-h-full grid grid-cols-[260px_1fr]">
      <aside className="bg-[var(--color-brand-blue)] text-white p-6 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-[var(--color-brand-blue)] flex items-center justify-center font-extrabold">
              360
            </div>
            <div>
              <div className="font-bold tracking-tight leading-none">360 Events</div>
              <div className="editorial text-white/70 text-sm">Aruba dashboard</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }: { isActive: boolean }) =>
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition " +
                (isActive
                  ? "bg-white text-[var(--color-brand-blue)]"
                  : "text-white/85 hover:bg-white/10")
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="mt-6 flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2">
          <LogOut size={16} /> Sign out
        </button>
        <div className="mt-6 text-[11px] text-white/55 leading-relaxed">
          <span className="editorial">Every angle, every moment, every celebration.</span>
        </div>
      </aside>
      <main className="p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
