"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { Channel } from "@/lib/constants";

type Conversation = {
  id: string;
  name: string;
  company: string;
  channel: Channel;
  preview: string;
  unread: number;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
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

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        const convs: Conversation[] = data.conversations ?? [];
        setConversations(convs);
        if (convs.length > 0) setActiveId(convs[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    fetch(`/api/conversations/${activeId}/messages`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoadingMessages(false));

    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
    fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: 0 }),
    });
  }, [activeId]);

  const active = conversations.find((c) => c.id === activeId);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    const text = draft.trim();
    setDraft("");

    const res = await fetch(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data.message]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, preview: text, updatedAt: data.message.createdAt, unread: 0 } : c))
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-xl border border-zinc-200 bg-white">
        <p className="text-sm text-zinc-500">No conversations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="w-80 flex-none overflow-y-auto border-r border-zinc-200">
        <div className="border-b border-zinc-100 p-4">
          <h1 className="text-lg font-semibold text-zinc-900">Inbox</h1>
          <p className="text-sm text-zinc-500">All channels</p>
        </div>
        <ul>
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setActiveId(conv.id)}
                className={`flex w-full items-start gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors ${
                  conv.id === activeId ? "bg-brand-50" : "hover:bg-zinc-50"
                }`}
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                  {initials(conv.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-900">{conv.name}</p>
                    <span className="flex-none text-xs text-zinc-400">{formatRelativeTime(conv.updatedAt)}</span>
                  </div>
                  <p className="truncate text-sm text-zinc-500">{conv.preview}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${channelStyle[conv.channel]}`}>
                      {conv.channel}
                    </span>
                    {conv.unread > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {active && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-zinc-200 p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
              {initials(active.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">{active.name}</p>
              <p className="text-xs text-zinc-500">{active.company}</p>
            </div>
            <span className={`ml-auto rounded px-2 py-1 text-xs font-medium ${channelStyle[active.channel]}`}>
              {active.channel}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loadingMessages ? (
              <p className="text-sm text-zinc-500">Loading messages...</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                      msg.from === "me"
                        ? "rounded-br-sm bg-brand-600 text-white"
                        : "rounded-bl-sm bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`mt-1 text-[11px] ${msg.from === "me" ? "text-brand-100" : "text-zinc-400"}`}>
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-zinc-200 p-4">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
