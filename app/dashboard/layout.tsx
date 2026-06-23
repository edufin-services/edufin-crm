import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import GlobalSearch from "./GlobalSearch";
import NavLink from "./NavLink";
import NotificationsBell from "./NotificationsBell";
import UserMenu from "./UserMenu";
import { getUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  GridIcon,
  ChatIcon,
  FunnelIcon,
  ChartIcon,
  CalendarIcon,
  ListIcon,
  RobotIcon,
  MailIcon,
} from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <GridIcon /> },
  { href: "/dashboard/leads", label: "Leads", icon: <FunnelIcon /> },
  { href: "/dashboard/chats", label: "Chats", icon: <ChatIcon /> },
  { href: "/dashboard/calendar", label: "Calendar", icon: <CalendarIcon /> },
  { href: "/dashboard/lists", label: "Lists", icon: <ListIcon /> },
  { href: "/dashboard/ai-agent", label: "AI Agent", icon: <RobotIcon /> },
  { href: "/dashboard/mail", label: "Mail", icon: <MailIcon /> },
  { href: "/dashboard/stats", label: "Stats", icon: <ChartIcon /> },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session?.userId ? getUserById(session.userId) : undefined;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 lg:flex">
        <Logo className="px-2" />

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-lg bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-900">Upgrade to Pro</p>
          <p className="mt-1 text-xs text-brand-700">
            Unlock automations, unlimited pipelines, and more.
          </p>
          <button className="mt-3 w-full rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            Upgrade now
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>

          <GlobalSearch />

          <div className="flex items-center gap-4">
            <NotificationsBell />
            <UserMenu name={user.name} company={user.company} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
