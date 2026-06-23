"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchIcon, FunnelIcon, UsersIcon, ChatIcon } from "./icons";
import type { SearchResult } from "@/app/api/search/route";

const typeIcon: Record<SearchResult["type"], React.ReactNode> = {
  lead: <FunnelIcon />,
  contact: <UsersIcon />,
  conversation: <ChatIcon />,
};

const typeStyle: Record<SearchResult["type"], string> = {
  lead: "bg-brand-50 text-brand-600",
  contact: "bg-indigo-50 text-indigo-600",
  conversation: "bg-blue-50 text-blue-600",
};

const typeLabel: Record<SearchResult["type"], string> = {
  lead: "Lead",
  contact: "Contact",
  conversation: "Conversation",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative hidden flex-1 max-w-md sm:block" ref={ref}>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-400">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search leads, contacts, chats..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">No results found.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link
                    href={r.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-50"
                  >
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${typeStyle[r.type]}`}>
                      {typeIcon[r.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{r.title}</p>
                      <p className="truncate text-xs text-zinc-500">{r.subtitle}</p>
                    </div>
                    <span className="flex-none text-[11px] text-zinc-400">{typeLabel[r.type]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
