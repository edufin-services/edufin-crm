"use client";

import { useEffect, useMemo, useState } from "react";
import { CHANNELS, STAGES, type Channel, type Stage } from "@/lib/constants";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { SearchIcon } from "../icons";

type Lead = {
  id: string;
  name: string;
  company: string;
  channel: Channel;
  value: number;
  stage: Stage;
  createdAt: string;
};

const stageAccent: Record<string, string> = {
  "Initial Contact": "border-t-brand-500",
  Connected: "border-t-indigo-500",
  Interested: "border-t-blue-500",
  Proposal: "border-t-sky-500",
  Registration: "border-t-cyan-500",
  "Admission Letter": "border-t-teal-500",
  "2nd Payment": "border-t-amber-500",
  OTC: "border-t-orange-500",
  Invitation: "border-t-violet-500",
  "3rd Payment": "border-t-fuchsia-500",
  "Visa Process": "border-t-emerald-500",
};

const channelStyle: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700",
  Instagram: "bg-pink-50 text-pink-700",
  TikTok: "bg-zinc-100 text-zinc-700",
  Email: "bg-blue-50 text-blue-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalStage, setModalStage] = useState<Stage | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel | "All">("All");

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => setLeads(data.leads ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddDeal(deal: { name: string; company: string; channel: Channel; value: number; stage: Stage }) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deal),
    });
    const data = await res.json();
    if (res.ok) {
      setLeads((prev) => [...prev, data.lead]);
      setModalStage(null);
    }
    return data;
  }

  async function handleStageChange(id: string, stage: Stage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  async function handleUpdateDeal(
    id: string,
    data: { name: string; company: string; channel: Channel; value: number; stage: Stage }
  ) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? body.lead : l)));
      setEditingLead(null);
    }
    return body;
  }

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const matchesSearch = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
      const matchesChannel = channelFilter === "All" || l.channel === channelFilter;
      return matchesSearch && matchesChannel;
    });
  }, [leads, search, channelFilter]);

  const totalPipelineValue = filteredLeads.reduce((sum, l) => sum + l.value, 0);
  const wonValue = filteredLeads.filter((l) => l.stage === "Visa Process").reduce((sum, l) => sum + l.value, 0);
  const avgDealSize = filteredLeads.length > 0 ? totalPipelineValue / filteredLeads.length : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Leads &amp; Deals</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage deals across your pipeline. Drag a card to move it between stages.</p>
        </div>
        <button
          onClick={() => setModalStage(STAGES[0])}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + New deal
        </button>
      </div>

      {!loading && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-400 sm:max-w-xs">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or company..."
              className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setChannelFilter("All")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                channelFilter === "All" ? "bg-brand-600 text-white" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              All channels
            </button>
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  channelFilter === c ? "bg-brand-600 text-white" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Total deals</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{filteredLeads.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Pipeline value</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(totalPipelineValue)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Avg. deal size</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(avgDealSize)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Visa Process value</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(wonValue)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const deals = filteredLeads
              .filter((l) => l.stage === stage)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const total = deals.reduce((sum, d) => sum + d.value, 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage((prev) => (prev === stage ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) handleStageChange(id, stage);
                  setDraggingId(null);
                }}
                className={`flex w-72 flex-none flex-col rounded-xl border-t-4 bg-zinc-100/70 p-3 transition-colors ${
                  stageAccent[stage]
                } ${dragOverStage === stage ? "bg-brand-50 ring-2 ring-inset ring-brand-300" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-zinc-900">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">
                    {deals.length}
                  </span>
                </div>
                <p className="mb-3 px-1 text-xs font-medium text-zinc-400">{formatCurrency(total)} total</p>

                <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto pr-0.5" style={{ maxHeight: "calc(100vh - 26rem)" }}>
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onClick={() => setEditingLead(deal)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", deal.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(deal.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                      className={`group cursor-pointer rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
                        draggingId === deal.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                          {initials(deal.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{deal.name}</p>
                          <p className="truncate text-xs text-zinc-500">{deal.company}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(deal.id);
                          }}
                          className="flex-none text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                          aria-label="Delete deal"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-900">{formatCurrency(deal.value)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${channelStyle[deal.channel]}`}>
                          {deal.channel}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                        <span className="text-[11px] text-zinc-400">{formatRelativeTime(deal.createdAt)}</span>
                        <select
                          value={deal.stage}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStageChange(deal.id, e.target.value as Stage)}
                          className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-medium text-zinc-400 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600 focus:border-brand-500 focus:outline-none"
                          aria-label="Move to stage"
                        >
                          <option value={deal.stage} disabled hidden>
                            Move to...
                          </option>
                          {STAGES.filter((s) => s !== deal.stage).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {deals.length === 0 && (
                    <p className="px-1 py-2 text-center text-xs text-zinc-400">No deals here yet.</p>
                  )}
                </div>

                <button
                  onClick={() => setModalStage(stage)}
                  className="mt-2 flex-none rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-400 hover:border-brand-300 hover:text-brand-600"
                >
                  + Add deal
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalStage && (
        <AddDealModal stage={modalStage} onClose={() => setModalStage(null)} onSubmit={handleAddDeal} />
      )}

      {editingLead && (
        <EditDealModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSubmit={(data) => handleUpdateDeal(editingLead.id, data)}
          onDelete={() => {
            setEditingLead(null);
            handleDelete(editingLead.id);
          }}
        />
      )}
    </div>
  );
}

function AddDealModal({
  stage,
  onClose,
  onSubmit,
}: {
  stage: Stage;
  onClose: () => void;
  onSubmit: (deal: { name: string; company: string; channel: Channel; value: number; stage: Stage }) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [channel, setChannel] = useState<Channel>(CHANNELS[0]);
  const [value, setValue] = useState("");
  const [stageValue, setStageValue] = useState<Stage>(stage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onSubmit({ name, company, channel, value: Number(value), stage: stageValue });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">New deal</h2>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Company</label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Deal value ($)</label>
              <input
                required
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="2500"
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Stage</label>
            <select
              value={stageValue}
              onChange={(e) => setStageValue(e.target.value as Stage)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDealModal({
  lead,
  onClose,
  onSubmit,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onSubmit: (data: { name: string; company: string; channel: Channel; value: number; stage: Stage }) => Promise<{ error?: string }>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [company, setCompany] = useState(lead.company);
  const [channel, setChannel] = useState<Channel>(lead.channel);
  const [value, setValue] = useState(String(lead.value));
  const [stage, setStage] = useState<Stage>(lead.stage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onSubmit({ name, company, channel, value: Number(value), stage });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Edit deal</h2>
          <span className="text-xs text-zinc-400">Created {formatRelativeTime(lead.createdAt)}</span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Company</label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Deal value ($)</label>
              <input
                required
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
