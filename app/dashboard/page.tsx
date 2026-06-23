import { redirect } from "next/navigation";
import { STAGES } from "@/lib/constants";
import {
  getConversationsByOwner,
  getLeadsByOwner,
  getTasksByOwner,
  getUserById,
  seedAccountData,
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

const stageColor: Record<string, string> = {
  "Initial Contact": "bg-brand-500",
  Connected: "bg-indigo-500",
  Interested: "bg-blue-500",
  Proposal: "bg-sky-500",
  Registration: "bg-cyan-500",
  "Admission Letter": "bg-teal-500",
  "2nd Payment": "bg-amber-500",
  OTC: "bg-orange-500",
  Invitation: "bg-violet-500",
  "3rd Payment": "bg-fuchsia-500",
  "Visa Process": "bg-emerald-500",
};

const stageBadge: Record<string, string> = {
  "Initial Contact": "bg-brand-50 text-brand-700",
  Connected: "bg-indigo-50 text-indigo-700",
  Interested: "bg-blue-50 text-blue-700",
  Proposal: "bg-sky-50 text-sky-700",
  Registration: "bg-cyan-50 text-cyan-700",
  "Admission Letter": "bg-teal-50 text-teal-700",
  "2nd Payment": "bg-amber-50 text-amber-700",
  OTC: "bg-orange-50 text-orange-700",
  Invitation: "bg-violet-50 text-violet-700",
  "3rd Payment": "bg-fuchsia-50 text-fuchsia-700",
  "Visa Process": "bg-emerald-50 text-emerald-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const user = getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  let leads = getLeadsByOwner(user.id);
  let conversations = getConversationsByOwner(user.id);
  let tasks = getTasksByOwner(user.id);

  if (leads.length === 0 && conversations.length === 0 && tasks.length === 0) {
    seedAccountData(user.id);
    leads = getLeadsByOwner(user.id);
    conversations = getConversationsByOwner(user.id);
    tasks = getTasksByOwner(user.id);
  }

  const newLeadsCount = leads.filter(
    (l) => Date.now() - new Date(l.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  const openDealsValue = leads.filter((l) => l.stage !== "Visa Process").reduce((sum, l) => sum + l.value, 0);
  const tasksDueToday = tasks.filter((t) => !t.done && isToday(t.dueDate)).length;
  const wonCount = leads.filter((l) => l.stage === "Visa Process").length;
  const conversionRate = leads.length > 0 ? ((wonCount / leads.length) * 100).toFixed(1) : "0.0";

  const STATS = [
    { label: "New Leads", value: String(newLeadsCount) },
    { label: "Open Deals", value: formatCurrency(openDealsValue) },
    { label: "Tasks Due Today", value: String(tasksDueToday) },
    { label: "Conversion Rate", value: `${conversionRate}%` },
  ];

  const pipeline = STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
    color: stageColor[stage],
  }));
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count));

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentMessages = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Here&apos;s what&apos;s happening with your sales today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Pipeline overview</h2>
            <a href="/dashboard/leads" className="text-sm font-medium text-brand-600 hover:text-brand-500">
              View pipeline
            </a>
          </div>
          <div className="mt-6 space-y-4">
            {pipeline.map((stage) => (
              <div key={stage.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{stage.stage}</span>
                  <span className="font-medium text-zinc-900">{stage.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100">
                  <div
                    className={`h-2 rounded-full ${stage.color}`}
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Recent messages</h2>
            <a href="/dashboard/chats" className="text-sm font-medium text-brand-600 hover:text-brand-500">
              Inbox
            </a>
          </div>
          {recentMessages.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No messages yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {recentMessages.map((msg) => (
                <li key={msg.id} className="flex gap-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                    {initials(msg.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-zinc-900">{msg.name}</p>
                      <span className="flex-none text-xs text-zinc-400">{formatRelativeTime(msg.updatedAt)}</span>
                    </div>
                    <p className="truncate text-sm text-zinc-500">{msg.preview}</p>
                    <span className="mt-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
                      {msg.channel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-base font-semibold text-zinc-900">Recent leads</h2>
          <a href="/dashboard/leads" className="text-sm font-medium text-brand-600 hover:text-brand-500">
            View all leads
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="px-5 py-3 font-medium">Value</th>
                <th className="px-5 py-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-zinc-900">{lead.name}</td>
                  <td className="px-5 py-3 text-zinc-500">{lead.company}</td>
                  <td className="px-5 py-3 text-zinc-500">{lead.channel}</td>
                  <td className="px-5 py-3 text-zinc-900">{formatCurrency(lead.value)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageBadge[lead.stage]}`}>
                      {lead.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
