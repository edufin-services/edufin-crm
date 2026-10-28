"use client";

import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  leadName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Move to Trash?",
  description = "Are you sure you want to move this lead to trash? You can restore it anytime from the Trash tab.",
  leadName,
  confirmLabel = "Move to Trash",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  useBodyScrollLock(isOpen);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 animate-scaleIn select-none"
      >
        <div className="flex flex-col items-center text-center">
          {/* Variant Icon Badge */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              variant === "danger"
                ? "bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-100/50"
                : variant === "warning"
                ? "bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-100/50"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-100/50"
            }`}
          >
            {variant === "danger" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            ) : variant === "warning" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            )}
          </div>

          {/* Heading */}
          <h3 className="mt-4 text-lg font-bold text-zinc-900 tracking-tight">
            {title}
          </h3>

          {/* Highlighted Lead Pill if provided */}
          {leadName && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {leadName}
            </div>
          )}

          {/* Subtext description */}
          <p className="mt-2.5 text-xs font-medium text-zinc-500 leading-relaxed max-w-xs">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-zinc-200/90 bg-white py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer ${
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                : variant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                {variant === "danger" && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                )}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
