"use client";

import { useState } from "react";
import { RobotIcon } from "../icons";

const SAMPLE_CONVERSATION = [
  { from: "them", text: "Hi, what are your pricing plans?" },
  { from: "agent", text: "Hi! We have three plans — Starter, Growth, and Pro. Would you like a quick breakdown of each?" },
  { from: "them", text: "Yes please, and is there a free trial?" },
  { from: "agent", text: "Yes, every plan includes a 14-day free trial, no card required. I can send you a comparison sheet — want me to do that?" },
];

export default function AiAgentPage() {
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("Pulse Assistant");
  const [persona, setPersona] = useState(
    "You are a friendly sales assistant for our company. Answer questions about pricing, features, and availability. Hand off to a human for anything related to refunds or contracts."
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI Agent</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure an AI assistant to handle first replies across your inbox.</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center gap-3">
          <span className="text-sm font-medium text-zinc-700">{enabled ? "Active" : "Inactive"}</span>
          <span className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-brand-600" />
            <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">Agent settings</h2>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Agent name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Instructions</label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={6}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Describe how the agent should respond. It will reply automatically to new conversations across connected channels.
            </p>
          </div>

          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Save settings
          </button>
        </div>

        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <RobotIcon />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-900">{name}</p>
              <p className="text-xs text-zinc-500">Preview conversation</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 p-5">
            {SAMPLE_CONVERSATION.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-sm rounded-2xl px-4 py-2 text-sm ${
                    msg.from === "agent"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-5 py-4 text-xs text-zinc-400">
            This is a sample preview. Turn the agent on to start auto-replying to real conversations.
          </div>
        </div>
      </div>
    </div>
  );
}
