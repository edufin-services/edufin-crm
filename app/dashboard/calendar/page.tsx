"use client";

import { useEffect, useMemo, useState } from "react";
import { PhoneIcon, MailIcon, CalendarIcon, ChatIcon } from "../icons";

type TaskType = "call" | "email" | "meeting" | "message";

type Task = {
  id: string;
  title: string;
  contact: string;
  type: TaskType;
  dueDate: string;
  done: boolean;
};

const typeIcon: Record<string, React.ReactNode> = {
  call: <PhoneIcon />,
  email: <MailIcon />,
  meeting: <CalendarIcon />,
  message: <ChatIcon />,
};

const typeStyle: Record<string, string> = {
  call: "bg-blue-50 text-blue-600",
  email: "bg-amber-50 text-amber-600",
  meeting: "bg-violet-50 text-violet-600",
  message: "bg-brand-50 text-brand-600",
};

const typeDot: Record<string, string> = {
  call: "bg-blue-500",
  email: "bg-amber-500",
  meeting: "bg-violet-500",
  message: "bg-brand-500",
};

const TASK_TYPES: TaskType[] = ["call", "email", "meeting", "message"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = dateKey(new Date(task.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    const result: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push(d);
    }
    return result;
  }, [cursor]);

  const selectedTasks = tasksByDay.get(dateKey(selectedDate)) ?? [];
  const today = new Date();

  async function handleToggle(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function handleAdd(data: { title: string; contact: string; type: TaskType; dueDate: string }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      setTasks((prev) => [...prev, body.task]);
      setShowModal(false);
    }
    return body;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">Schedule and track calls, meetings, and follow-ups.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New event
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">
                {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(now);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Today
                </button>
                <button
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100 text-xs">
              {WEEKDAYS.map((day) => (
                <div key={day} className="bg-zinc-50 px-2 py-2 text-center font-medium text-zinc-500">
                  {day}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = dateKey(day) === dateKey(today);
                const isSelected = dateKey(day) === dateKey(selectedDate);
                const dayTasks = tasksByDay.get(dateKey(day)) ?? [];

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex min-h-20 flex-col items-start gap-1.5 bg-white p-1.5 text-left transition-colors hover:bg-zinc-50 ${
                      !inMonth ? "text-zinc-300" : "text-zinc-700"
                    } ${isSelected ? "ring-2 ring-inset ring-brand-500" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday ? "bg-brand-600 text-white" : ""
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {dayTasks.slice(0, 4).map((t) => (
                        <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${typeDot[t.type]} ${t.done ? "opacity-30" : ""}`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h2>
            </div>
            {selectedTasks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-400">No events scheduled.</p>
            ) : (
              <ul>
                {selectedTasks.map((task) => (
                  <li key={task.id} className="group flex items-center gap-3 border-b border-zinc-50 px-5 py-3 last:border-0">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) => handleToggle(task.id, e.target.checked)}
                      className="h-4 w-4 flex-none rounded border-zinc-300 accent-brand-600"
                    />
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${typeStyle[task.type]}`}>
                      {typeIcon[task.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${task.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{task.contact}</p>
                    </div>
                    <span className="flex-none text-xs font-medium text-zinc-500">{formatTime(task.dueDate)}</span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="flex-none text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      aria-label="Delete event"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <AddEventModal
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}

function AddEventModal({
  defaultDate,
  onClose,
  onSubmit,
}: {
  defaultDate: Date;
  onClose: () => void;
  onSubmit: (data: { title: string; contact: string; type: TaskType; dueDate: string }) => Promise<{ error?: string }>;
}) {
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [type, setType] = useState<TaskType>("call");
  const [dueDate, setDueDate] = useState(() => toDatetimeLocal(defaultDate));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onSubmit({ title, contact, type, dueDate: new Date(dueDate).toISOString() });
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">New event</h2>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow-up call about pricing"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Contact</label>
            <input
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Sarah Mitchell · Brightline Co."
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Date &amp; time</label>
              <input
                required
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
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
              {loading ? "Adding..." : "Add event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
