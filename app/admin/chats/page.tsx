"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import type { Channel } from "@/lib/constants";

type Conversation = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  channel: Channel;
  preview: string;
  unread: number;
  updatedAt: string;
  whatsappId?: string;
  ownerName?: string;
  ownerEmail?: string;
};

type Message = {
  id: string;
  conversationId: string;
  ownerId: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
};

type Agent = {
  id: string;
  name: string;
  email: string;
};

const channelBadgeStyle: Record<string, string> = {
  WhatsApp: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200/80",
  Facebook: "bg-blue-50 text-blue-700 border-blue-200/80",
  Ads: "bg-purple-50 text-purple-700 border-purple-200/80",
  "Meta Ads": "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  "Google Sheets": "bg-teal-50 text-teal-700 border-teal-200/80",
  Website: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
  Email: "bg-sky-50 text-sky-700 border-sky-200/80",
  "Referral/Others": "bg-amber-50 text-amber-700 border-amber-200/80",
};

const GRADIENTS: Record<string, string> = {
  A: "from-rose-400 to-rose-600", B: "from-pink-400 to-pink-600", C: "from-fuchsia-400 to-fuchsia-600",
  D: "from-violet-400 to-violet-600", E: "from-indigo-400 to-indigo-600", F: "from-blue-400 to-blue-600",
  G: "from-sky-400 to-sky-600", H: "from-cyan-400 to-cyan-600", I: "from-teal-400 to-teal-600",
  J: "from-emerald-400 to-emerald-600", K: "from-green-400 to-green-600", L: "from-lime-400 to-lime-600",
  M: "from-amber-400 to-amber-600", N: "from-orange-400 to-orange-600", O: "from-red-400 to-red-600",
  P: "from-rose-400 to-rose-600", Q: "from-purple-400 to-purple-600", R: "from-blue-400 to-blue-600",
  S: "from-sky-400 to-sky-600", T: "from-teal-400 to-teal-600", U: "from-cyan-400 to-cyan-600",
  V: "from-violet-400 to-violet-600", W: "from-fuchsia-400 to-fuchsia-600", X: "from-indigo-400 to-indigo-600",
  Y: "from-amber-400 to-amber-600", Z: "from-orange-400 to-orange-600",
};

function grad(name: string) {
  return GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-rose-500 to-rose-600";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const QUICK_RESPONSES = [
  "Hi! How can I assist you with FX rates today?",
  "Our current USD card rate is 83.45 with zero margins for students.",
  "Thank you for contacting EduFin! Sending the official fee sheet right over.",
  "Please share your passport copy and student visa to proceed with KYC.",
  "Hello, your assigned counselor will call you within 15 minutes.",
];

export default function AdminChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    try {
      const [convRes, agentsRes] = await Promise.all([
        fetch("/api/admin/conversations"),
        fetch("/api/admin/agents"),
      ]);

      const convData = await convRes.json();
      const convs: Conversation[] = convData.conversations ?? [];
      setConversations(convs);

      if (agentsRes.ok) {
        const agData = await agentsRes.json();
        setAgents(agData.agents ?? []);
      }

      if (convs.length > 0 && !activeId) {
        setActiveId(convs[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch admin conversations or agents:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleRefresh() {
    setIsRefreshing(true);
    loadData();
  }

  // Load messages for the active conversation
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    fetch(`/api/conversations/${activeId}/messages`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));

    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
    fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: 0 }),
    }).catch(() => {});
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = conversations.find((c) => c.id === activeId);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesChannel = channelFilter === "All" || c.channel === channelFilter;
      const matchesAgent = agentFilter === "All" || c.ownerId === agentFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(q)) ||
        (c.ownerEmail && c.ownerEmail.toLowerCase().includes(q)) ||
        (c.whatsappId && c.whatsappId.toLowerCase().includes(q)) ||
        c.preview.toLowerCase().includes(q);

      return matchesChannel && matchesAgent && matchesSearch;
    });
  }, [conversations, channelFilter, agentFilter, search]);

  // Aggregate stats
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations]
  );
  const activeAgentsCount = useMemo(() => {
    const set = new Set(conversations.map((c) => c.ownerId));
    return set.size;
  }, [conversations]);

  async function handleSend(e?: React.FormEvent, textOverride?: string) {
    if (e) e.preventDefault();
    const textToSend = textOverride || draft;
    if (!textToSend.trim() || !activeId || sending) return;

    setDraft("");
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, preview: textToSend.trim(), updatedAt: data.message.createdAt, unread: 0 }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to send message as admin:", err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xs">
        <div className="w-84 sm:w-96 flex-none border-r border-zinc-100 p-4 space-y-4">
          <div className="h-6 w-36 rounded bg-zinc-200 animate-pulse" />
          <div className="h-9 w-full rounded-xl bg-zinc-100 animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse pt-2">
              <div className="h-10 w-10 rounded-full bg-zinc-200 flex-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-zinc-200" />
                <div className="h-2.5 w-full rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 p-6 flex items-center justify-center text-sm text-zinc-400">
          Loading all team conversations...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Team Chats &amp; Omnichannel Inbox</h1>
            <span className="rounded-full bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              Admin Supervision
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Monitor, inspect, and reply to all leads and customer conversations across every agent and branch.
          </p>
        </div>

        {/* Stats and Refresh Action */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 shadow-2xs text-xs font-semibold text-zinc-600">
            <span>Conversations: <b className="text-zinc-900">{conversations.length}</b></span>
            <span className="text-zinc-300">|</span>
            <span>Agents: <b className="text-zinc-900">{activeAgentsCount}</b></span>
            {totalUnread > 0 && (
              <>
                <span className="text-zinc-300">|</span>
                <span className="text-rose-600 font-bold">Unread: {totalUnread}</span>
              </>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            title="Refresh conversations"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className={isRefreshing ? "animate-spin text-rose-600" : "text-zinc-500"}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Filter Controls Row ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-2xs">
        {/* Left: Agent / User Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-600 shrink-0">Filter by User / Agent:</label>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-500 transition-colors"
          >
            <option value="All">All Users &amp; Agents ({conversations.length} chats)</option>
            {agents.map((ag) => {
              const count = conversations.filter((c) => c.ownerId === ag.id).length;
              return (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email}) — {count} chats
                </option>
              );
            })}
          </select>
        </div>

        {/* Right: Channel Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["All", "WhatsApp", "Instagram", "Facebook", "Email", "Referral/Others"].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                channelFilter === ch
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-50 text-zinc-600 border border-zinc-200/80 hover:bg-zinc-100"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Interface Layout ──────────────────────────────────── */}
      <div className="flex h-[calc(100vh-13.5rem)] overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs">
        {/* Left Sidebar Conversations List */}
        <div className="w-84 sm:w-96 flex-none flex flex-col border-r border-zinc-100 bg-zinc-50/40">
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-100 bg-white">
            <div className="relative">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads, assigned agents, messages..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mt-2 px-1">
              <span>Showing {filteredConversations.length} conversation{filteredConversations.length === 1 ? "" : "s"}</span>
              {(channelFilter !== "All" || agentFilter !== "All" || search) && (
                <button
                  onClick={() => {
                    setChannelFilter("All");
                    setAgentFilter("All");
                    setSearch("");
                  }}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="mx-auto text-zinc-300"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="font-semibold text-zinc-600">No conversations found</p>
                <p className="text-[11px]">Try adjusting your search query, agent, or channel filter.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeId;
                const badgeClass = channelBadgeStyle[conv.channel] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";

                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveId(conv.id)}
                      className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-rose-50/70 border-r-4 border-r-rose-600"
                          : "hover:bg-zinc-100/70"
                      }`}
                    >
                      <div className="relative flex-none">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${grad(
                            conv.name
                          )} text-xs font-black text-white shadow-xs`}
                        >
                          {initials(conv.name)}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={`truncate text-xs font-bold ${isSelected ? "text-rose-950" : "text-zinc-900"}`}>
                            {conv.name}
                          </p>
                          <span className="text-[10px] font-medium text-zinc-400 shrink-0">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>

                        {/* Assigned Agent Tag */}
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-zinc-500 truncate">
                          <span className="text-[10px] text-zinc-400">Agent:</span>
                          <span className="rounded bg-zinc-100 px-1 py-0.2 text-[10px] font-bold text-zinc-700 truncate max-w-[150px]">
                            {conv.ownerName || "Assigned Agent"}
                          </span>
                        </div>

                        <p className="truncate text-[11px] text-zinc-500 mt-1">{conv.preview || "No messages yet"}</p>

                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold border ${badgeClass}`}>
                            {conv.channel}
                          </span>
                          {conv.unread > 0 && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-2xs">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Right Active Chat View */}
        {active ? (
          <div className="flex flex-1 flex-col min-w-0 bg-white">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-6 py-3 bg-zinc-50/40">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${grad(
                      active.name
                    )} text-sm font-black text-white shadow-xs`}
                  >
                    {initials(active.name)}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-zinc-900">{active.name}</h2>
                    <span className="rounded-md bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[9px] font-extrabold border border-rose-200/70">
                      Live Thread
                    </span>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold border ${channelBadgeStyle[active.channel] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {active.channel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 font-medium mt-0.5">
                    <span>{active.company || "Prospective Client"}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-zinc-600 font-semibold">
                      Assigned Agent: <b className="text-zinc-900 font-bold">{active.ownerName || "Agent"}</b>
                      {active.ownerEmail && <span className="text-zinc-400 font-normal"> ({active.ownerEmail})</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                {active.whatsappId && (
                  <a
                    href={`https://wa.me/${active.whatsappId.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition-colors"
                    title="Open in WhatsApp Web"
                  >
                    <span>WhatsApp Web</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                )}
                <Link
                  href={`/admin/leads?search=${encodeURIComponent(active.name)}`}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>View in Leads</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-zinc-50/30">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} animate-pulse`}>
                      <div className={`h-11 w-64 rounded-2xl ${i % 2 === 0 ? "bg-zinc-200" : "bg-rose-200"}`} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-xs font-bold text-zinc-700">No messages in this conversation yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Send a response below to start communication.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-md space-y-1">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs ${
                          msg.from === "me"
                            ? "rounded-br-xs bg-gradient-to-r from-rose-600 to-rose-700 text-white"
                            : "rounded-bl-xs bg-white text-zinc-800 border border-zinc-200/80"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-[10px] ${
                          msg.from === "me" ? "justify-end text-rose-700 font-bold" : "text-zinc-400"
                        }`}
                      >
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.from === "me" && <span>✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Response Templates Chips */}
            <div className="px-6 py-2 border-t border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
                Admin Quick Reply:
              </span>
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setDraft(tmpl)}
                  className="rounded-lg bg-zinc-100 hover:bg-rose-50 hover:text-rose-800 text-zinc-700 px-2.5 py-1 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer border border-zinc-200/60"
                >
                  {tmpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply as Admin to ${active.name} (${active.channel})...`}
                  disabled={sending}
                  className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-bold text-white hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <span>{sending ? "Sending..." : "Send"}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-400">
            Select a conversation from the left sidebar to view messages.
          </div>
        )}
      </div>
    </div>
  );
}
