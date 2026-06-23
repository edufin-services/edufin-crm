import { redirect } from "next/navigation";
import { STAGES, CHANNELS } from "@/lib/constants";
import { getContactsByOwner, getLeadsByOwner, seedAccountData } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const channelColor: Record<string, string> = {
  WhatsApp: "bg-emerald-500",
  Instagram: "bg-pink-500",
  TikTok: "bg-zinc-700",
  Email: "bg-blue-500",
};

export default async function StatsPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  let leads = getLeadsByOwner(session.userId);
  let contacts = getContactsByOwner(session.userId);

  if (leads.length === 0 && contacts.length === 0) {
    seedAccountData(session.userId);
    leads = getLeadsByOwner(session.userId);
    contacts = getContactsByOwner(session.userId);
  }

  const wonLeads = leads.filter((l) => l.stage === "Visa Process");
  const totalRevenue = wonLeads.reduce((sum, l) => sum + l.value, 0);
  const totalValue = leads.reduce((sum, l) => sum + l.value, 0);
  const winRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
  const avgDealSize = leads.length > 0 ? totalValue / leads.length : 0;
  const newLeadsLast30 = leads.filter(
    (l) => Date.now() - new Date(l.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;

  const STATS = [
    { label: "Total Revenue (Won)", value: formatCurrency(totalRevenue) },
    { label: "New Leads (30d)", value: String(newLeadsLast30) },
    { label: "Win Rate", value: `${winRate.toFixed(1)}%` },
    { label: "Avg. Deal Size", value: formatCurrency(avgDealSize) },
  ];

  // Revenue trend: total lead value created per month, last 6 months
  const months: { key: string; label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString(undefined, { month: "short" }), value: 0 });
  }
  for (const lead of leads) {
    const d = new Date(lead.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const month = months.find((m) => m.key === key);
    if (month) month.value += lead.value;
  }
  const maxRevenue = Math.max(1, ...months.map((m) => m.value));

  // Leads by channel
  const channelCounts = CHANNELS.map((channel) => ({
    name: channel,
    leads: leads.filter((l) => l.channel === channel).length,
    color: channelColor[channel],
  }));
  const maxChannel = Math.max(1, ...channelCounts.map((c) => c.leads));

  // Conversion funnel: cumulative count of leads at or beyond each stage
  const stageIndex = (stage: string) => STAGES.indexOf(stage as (typeof STAGES)[number]);
  const funnel = STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => stageIndex(l.stage) >= stageIndex(stage)).length,
  }));
  const maxFunnel = Math.max(1, funnel[0]?.count ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Stats</h1>
        <p className="mt-1 text-sm text-zinc-500">Performance overview based on your pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Pipeline value by month created</h2>
        <div className="mt-6 flex h-48 items-end gap-3">
          {months.map((bar) => (
            <div key={bar.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-brand-500"
                  style={{ height: `${(bar.value / maxRevenue) * 100}%` }}
                  title={formatCurrency(bar.value)}
                />
              </div>
              <span className="text-xs text-zinc-400">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">Leads by channel</h2>
          <div className="mt-6 space-y-4">
            {channelCounts.map((channel) => (
              <div key={channel.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{channel.name}</span>
                  <span className="font-medium text-zinc-900">{channel.leads.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100">
                  <div
                    className={`h-2 rounded-full ${channel.color}`}
                    style={{ width: `${(channel.leads / maxChannel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">Conversion funnel</h2>
          <div className="mt-6 space-y-4">
            {funnel.map((step) => (
              <div key={step.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{step.stage}</span>
                  <span className="font-medium text-zinc-900">{step.count.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-brand-600"
                    style={{ width: `${(step.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
