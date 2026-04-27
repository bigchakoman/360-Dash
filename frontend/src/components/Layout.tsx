import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, CalendarDays, Home, KeyRound, LogOut, Menu, Settings, Tag, Users, X } from "lucide-react";
import { useAuth } from "../lib/auth";

const navItems = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/crew", label: "Crew", icon: Users },
  { to: "/equipment", label: "Equipment", icon: Tag },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarContents({ onNav }: { onNav?: () => void }) {
  const { logout } = useAuth();
  return (
    <>
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
            onClick={onNav}
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
      <NavLink
        to="/change-password"
        onClick={onNav}
        className="mt-6 flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg"
      >
        <KeyRound size={16} /> Change password
      </NavLink>
      <button
        onClick={() => { onNav?.(); logout(); }}
        className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg"
      >
        <LogOut size={16} /> Sign out
      </button>
      <div className="mt-6 text-[11px] text-white/55 leading-relaxed">
        <span className="editorial">Every angle, every moment, every celebration.</span>
      </div>
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[260px_1fr]">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[var(--color-brand-blue)] text-white flex items-center justify-between px-4 shadow">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white text-[var(--color-brand-blue)] flex items-center justify-center font-extrabold text-sm">
            360
          </div>
          <span className="font-bold tracking-tight">360 Events</span>
        </div>
        <button
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/10"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Desktop sidebar (always visible at lg+) */}
      <aside className="hidden lg:flex bg-[var(--color-brand-blue)] text-white p-6 flex-col">
        <SidebarContents />
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--color-brand-blue)] text-white p-6 flex flex-col transition-transform duration-200 ease-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <button
          aria-label="Close menu"
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <SidebarContents onNav={() => setOpen(false)} />
      </aside>

      {/* Main content — extra top padding on mobile to clear the fixed top bar */}
      <main className="p-6 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
