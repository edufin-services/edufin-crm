"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import ConfirmModal from "@/app/components/ConfirmModal";
import type { Channel } from "@/lib/constants";
import type { ImportedLead } from "@/lib/db";
import { decodeTextBytes, extractLeadFromRow, parseCsvToRows, type ExtractedLeadRow } from "@/lib/lead-parser";

type UserItem = {
  id: string;
  name: string;
  email: string;
  company: string;
  isLeadPaused?: boolean;
  leadPauseReason?: string;
};

const GRADIENTS: Record<string, string> = {
  A: "from-rose-400 to-rose-600",
  B: "from-pink-400 to-pink-600",
  C: "from-fuchsia-400 to-fuchsia-600",
  D: "from-violet-400 to-violet-600",
  E: "from-indigo-400 to-indigo-600",
  F: "from-blue-400 to-blue-600",
  G: "from-sky-400 to-sky-600",
  H: "from-cyan-400 to-cyan-600",
  I: "from-teal-400 to-teal-600",
  J: "from-emerald-400 to-emerald-600",
  K: "from-green-400 to-green-600",
  L: "from-lime-400 to-lime-600",
  M: "from-amber-400 to-amber-600",
  N: "from-orange-400 to-orange-600",
  O: "from-red-400 to-red-600",
  P: "from-rose-400 to-rose-600",
  Q: "from-purple-400 to-purple-600",
  R: "from-blue-400 to-blue-600",
  S: "from-sky-400 to-sky-600",
  T: "from-teal-400 to-teal-600",
  U: "from-cyan-400 to-cyan-600",
  V: "from-violet-400 to-violet-600",
  W: "from-fuchsia-400 to-fuchsia-600",
  X: "from-indigo-400 to-indigo-600",
  Y: "from-amber-400 to-amber-600",
  Z: "from-orange-400 to-orange-600",
};

const grad = (name: string) => GRADIENTS[name[0]?.toUpperCase() ?? "A"] ?? "from-zinc-400 to-zinc-600";
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export default function ImportLeadsClient({
  initialLeads,
  users,
  existingContacts,
}: {
  initialLeads: ImportedLead[];
  users: UserItem[];
  existingContacts?: { phones: string[]; emails: string[] };
}) {
  const [leads, setLeads] = useState<ImportedLead[]>(initialLeads);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "assigned">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadTargetUserId, setUploadTargetUserId] = useState<string>("");
  const [parsedPreview, setParsedPreview] = useState<ExtractedLeadRow[]>([]);
  const [previewFileName, setPreviewFileName] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [viewingAnswersLead, setViewingAnswersLead] = useState<ImportedLead | ExtractedLeadRow | null>(null);

  // Bulk and single assignment state
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [rowUserSelect, setRowUserSelect] = useState<Record<string, string>>({});
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "primary" | "warning";
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5500);
  }

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (activeTab === "pending" && l.status !== "pending") return false;
      if (activeTab === "assigned" && l.status !== "assigned") return false;

      if (platformFilter !== "all") {
        const plat = (l.platform || "").toLowerCase();
        if (platformFilter === "fb" && plat !== "fb" && !plat.includes("facebook")) return false;
        if (platformFilter === "ig" && plat !== "ig" && !plat.includes("instagram")) return false;
        if (
          platformFilter === "other" &&
          (plat === "fb" || plat.includes("facebook") || plat === "ig" || plat.includes("instagram"))
        )
          return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesPhone = l.phone.includes(q) || (l.rawPhone || "").includes(q);
        const matchesPlatform =
          (l.platform || "").toLowerCase().includes(q) || (l.channel || "").toLowerCase().includes(q);
        const matchesAssigned = (l.assignedToUserName || "").toLowerCase().includes(q);
        const matchesFile = (l.fileName || "").toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesPlatform || matchesAssigned || matchesFile;
      }

      return true;
    });
  }, [leads, activeTab, platformFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter((l) => l.status === "pending").length;
    const assigned = leads.filter((l) => l.status === "assigned").length;
    return { total, pending, assigned };
  }, [leads]);

  // Preview deduplication analysis - checks both DB existing contacts and file duplicates
  const previewAnalysis = useMemo(() => {
    const existingPhoneSet = new Set<string>();
    const existingEmailSet = new Set<string>();

    // Seed from all CRM leads & DB
    if (existingContacts?.phones) {
      existingContacts.phones.forEach((p) => {
        if (p.length >= 7) existingPhoneSet.add(p);
      });
    }
    if (existingContacts?.emails) {
      existingContacts.emails.forEach((e) => {
        if (e && e.includes("@")) existingEmailSet.add(e.toLowerCase().trim());
      });
    }

    // Seed from current imported leads table
    leads.forEach((l) => {
      const p = (l.phone || "").replace(/\D/g, "").slice(-10);
      if (p.length >= 7) existingPhoneSet.add(p);
      if (l.email && l.email.includes("@")) existingEmailSet.add(l.email.trim().toLowerCase());
    });

    const seenInPreviewPhones = new Set<string>();
    const seenInPreviewEmails = new Set<string>();
    const seenInPreviewKeys = new Set<string>();

    let newCount = 0;
    let dupCount = 0;

    const analyzed = parsedPreview.map((item) => {
      const cleanP = (item.phone || "").replace(/\D/g, "").slice(-10);
      const cleanE = item.email && item.email.includes("@") ? item.email.trim().toLowerCase() : "";
      const fallbackKey = cleanP || cleanE || item.name.toLowerCase().trim();

      let isDuplicate = false;
      let reason = "";

      if (cleanP && cleanP.length >= 7 && existingPhoneSet.has(cleanP)) {
        isDuplicate = true;
        reason = `Already in CRM / Queue (Phone: ${cleanP})`;
      } else if (cleanE && existingEmailSet.has(cleanE)) {
        isDuplicate = true;
        reason = `Already in CRM / Queue (Email: ${cleanE})`;
      } else if (cleanP && cleanP.length >= 7 && seenInPreviewPhones.has(cleanP)) {
        isDuplicate = true;
        reason = "Duplicate in this file (Same phone)";
      } else if (cleanE && seenInPreviewEmails.has(cleanE)) {
        isDuplicate = true;
        reason = "Duplicate in this file (Same email)";
      } else if (fallbackKey && seenInPreviewKeys.has(fallbackKey)) {
        isDuplicate = true;
        reason = "Duplicate in this file";
      } else {
        if (cleanP && cleanP.length >= 7) seenInPreviewPhones.add(cleanP);
        if (cleanE) seenInPreviewEmails.add(cleanE);
        if (fallbackKey) seenInPreviewKeys.add(fallbackKey);
      }

      if (isDuplicate) dupCount++;
      else newCount++;

      return { ...item, isDuplicate, reason };
    });

    return { analyzed, newCount, dupCount };
  }, [parsedPreview, leads, existingContacts]);

  // Handle client-side file reading and parsing (supports .csv, .xls, .xlsx)
  function processParsedRows(rows: Record<string, any>[], fileName: string) {
    if (rows.length === 0) {
      showToast("No data rows found in the uploaded file.", "error");
      setIsUploading(false);
      return;
    }

    const extracted: ExtractedLeadRow[] = [];
    for (const row of rows) {
      const leadItem = extractLeadFromRow(row, fileName);
      if (leadItem) {
        extracted.push(leadItem);
      }
    }

    if (extracted.length === 0) {
      showToast(
        "Could not detect student name or phone columns in the file. Please check column headers.",
        "error"
      );
      setIsUploading(false);
      return;
    }

    setParsedPreview(extracted);
    setPreviewFileName(fileName);
    setShowPreviewModal(true);
    setIsUploading(false);
  }

  function parseExcelFile(file: File) {
    setIsUploading(true);
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".tsv") || file.type.includes("csv");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuf = e.target?.result as ArrayBuffer;
        const u8 = new Uint8Array(arrayBuf);
        let rows: Record<string, any>[] = [];

        if (isCsv) {
          // Decode text properly handling UTF-16LE (Meta Ads export format), UTF-8 BOM, and plain text
          const text = decodeTextBytes(u8);
          rows = parseCsvToRows(text);

          // If fallback needed, try XLSX with string type
          if (rows.length === 0) {
            const wb = XLSX.read(text, { type: "string", raw: true });
            const firstSheet = wb.SheetNames[0];
            if (firstSheet) {
              rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });
            }
          }
        } else {
          // Excel .xls, .xlsx, or XML Spreadsheet
          const workbook = XLSX.read(u8, { type: "array", codepage: 65001 });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            showToast("The uploaded file does not contain any readable sheets or data.", "error");
            setIsUploading(false);
            return;
          }

          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        }

        processParsedRows(rows, file.name);
      } catch (err: any) {
        showToast(`Failed to parse file: ${err?.message || "Unknown error"}`, "error");
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      showToast("Error reading file.", "error");
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
    e.target.value = "";
  }

  // Upload parsed leads to server with automatic deduplication (only uploads unique new leads)
  async function confirmUploadLeads(assignToUserId?: string) {
    if (parsedPreview.length === 0) return;

    // Filter to ONLY unique, new leads (ignore duplicates)
    const newLeadsOnly = previewAnalysis.analyzed.filter((l) => !l.isDuplicate);

    if (newLeadsOnly.length === 0) {
      showToast(
        `All ${previewAnalysis.dupCount} leads in this file already exist in the CRM / Queue. No duplicate leads were added.`,
        "error"
      );
      setShowPreviewModal(false);
      setParsedPreview([]);
      setPreviewFileName("");
      return;
    }

    setIsUploading(true);

    try {
      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: newLeadsOnly.map((p) => ({
            ...p,
            fileName: previewFileName,
          })),
          fileName: previewFileName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to import leads");
      }

      const newLeads: ImportedLead[] = data.leads || [];
      const skippedCount: number = (data.skippedCount || 0) + previewAnalysis.dupCount;

      if (newLeads.length === 0) {
        showToast(`All ${skippedCount} leads in this file already exist. No duplicate leads were added.`, "error");
        setShowPreviewModal(false);
        setParsedPreview([]);
        setPreviewFileName("");
        setIsUploading(false);
        return;
      }

      // If user selected immediate assignment during upload
      if (assignToUserId) {
        const targetUser = users.find((u) => u.id === assignToUserId);
        const leadIds = newLeads.map((l) => l.id);

        const assignRes = await fetch("/api/admin/leads/import/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadIds,
            userId: assignToUserId,
            userName: targetUser?.name || "Assigned User",
          }),
        });

        const assignData = await assignRes.json();
        if (assignRes.ok && assignData.success) {
          const now = new Date().toISOString();
          const updatedWithAssign = newLeads.map((l) => ({
            ...l,
            status: "assigned" as const,
            assignedToUserId: assignToUserId,
            assignedToUserName: targetUser?.name || "Assigned User",
            assignedAt: now,
          }));
          setLeads((prev) => [...updatedWithAssign, ...prev]);
          showToast(
            `Imported ${newLeads.length} new leads and assigned to ${targetUser?.name || "User"} (Initial stage).${
              skippedCount > 0 ? ` (${skippedCount} duplicate leads skipped)` : ""
            }`
          );
        } else {
          setLeads((prev) => [...newLeads, ...prev]);
          showToast(
            `Imported ${newLeads.length} new leads.${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""}`
          );
        }
      } else {
        setLeads((prev) => [...newLeads, ...prev]);
        showToast(
          `Imported ${newLeads.length} new leads into pending queue.${
            skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""
          }`
        );
      }

      setShowPreviewModal(false);
      setParsedPreview([]);
      setPreviewFileName("");
    } catch (err: any) {
      showToast(err?.message || "Failed to upload leads.", "error");
    } finally {
      setIsUploading(false);
    }
  }

  // Single Row Assignment
  async function handleAssignSingle(lead: ImportedLead, targetUserId: string) {
    if (!targetUserId) {
      showToast("Please select a user first.", "error");
      return;
    }
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) return;

    setIsAssigning(true);
    try {
      const res = await fetch("/api/admin/leads/import/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          userId: targetUserId,
          userName: targetUser.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign lead");
      }

      const updated = data.importedLead;
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      showToast(`Assigned ${lead.name} to ${targetUser.name} (moved to Initial stage in CRM).`);
    } catch (err: any) {
      showToast(err.message || "Failed to assign lead", "error");
    } finally {
      setIsAssigning(false);
    }
  }

  // Bulk Assignment
  async function handleBulkAssign(targetUserId: string) {
    if (selectedIds.size === 0) {
      showToast("Select at least one lead to assign.", "error");
      return;
    }
    if (!targetUserId) {
      showToast("Please choose a user to assign to.", "error");
      return;
    }

    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) return;

    setIsAssigning(true);
    const ids = Array.from(selectedIds);

    try {
      const res = await fetch("/api/admin/leads/import/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: ids,
          userId: targetUserId,
          userName: targetUser.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to bulk assign leads");
      }

      const now = new Date().toISOString();
      setLeads((prev) =>
        prev.map((l) =>
          selectedIds.has(l.id)
            ? {
                ...l,
                status: "assigned",
                assignedToUserId: targetUserId,
                assignedToUserName: targetUser.name,
                assignedAt: now,
              }
            : l
        )
      );

      setSelectedIds(new Set());
      setBulkAssignee("");
      showToast(`Assigned ${ids.length} leads to ${targetUser.name} (Initial stage in CRM).`);
    } catch (err: any) {
      showToast(err.message || "Failed to assign leads.", "error");
    } finally {
      setIsAssigning(false);
    }
  }

  // Round-Robin Distribution

  async function handleRoundRobinDistribute() {
    if (selectedIds.size === 0) {
      showToast("Select at least one lead to distribute.", "error");
      return;
    }
    if (users.length === 0) {
      showToast("No CRM users available for distribution.", "error");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Distribute Leads Evenly?",
      description: `Evenly distribute ${selectedIds.size} leads across all ${users.length} active CRM users using round-robin distribution?`,
      confirmLabel: "Distribute Leads",
      variant: "primary",
      onConfirm: async () => {
        setConfirmConfig((prev) => prev ? { ...prev, isLoading: true } : null);
        setIsAssigning(true);
        const ids = Array.from(selectedIds);

        try {
          const res = await fetch("/api/admin/leads/import/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadIds: ids,
              mode: "round_robin",
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to distribute leads");
          }

          const refreshRes = await fetch("/api/admin/leads/import");
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.leads) {
            setLeads(refreshData.leads);
          }

          setSelectedIds(new Set());
          showToast(data.message || `Distributed ${ids.length} leads across users.`);
        } catch (err: any) {
          showToast(err.message || "Failed to distribute leads.", "error");
        } finally {
          setIsAssigning(false);
          setConfirmConfig(null);
        }
      },
    });
  }

  // Delete Leads
  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: `Delete ${selectedIds.size} Imported Leads?`,
      description: `Are you sure you want to delete ${selectedIds.size} selected imported lead records? This cannot be undone.`,
      confirmLabel: "Delete Leads",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig((prev) => prev ? { ...prev, isLoading: true } : null);
        const ids = Array.from(selectedIds);
        try {
          const res = await fetch("/api/admin/leads/import", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          if (res.ok) {
            setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
            setSelectedIds(new Set());
            showToast(`Deleted ${ids.length} imported leads.`);
          }
        } catch {
          showToast("Failed to delete leads.", "error");
        } finally {
          setConfirmConfig(null);
        }
      },
    });
  }

  async function handleDeleteSingle(id: string) {
    const lead = leads.find((l) => l.id === id);
    setConfirmConfig({
      isOpen: true,
      title: "Delete Imported Lead?",
      description: "Are you sure you want to permanently delete this imported lead record?",
      confirmLabel: "Delete Lead",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig((prev) => prev ? { ...prev, isLoading: true } : null);
        try {
          const res = await fetch(`/api/admin/leads/import?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            setLeads((prev) => prev.filter((l) => l.id !== id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            showToast("Lead record deleted.");
          }
        } catch {
          showToast("Failed to delete lead.", "error");
        } finally {
          setConfirmConfig(null);
        }
      },
    });
  }

  // Selection toggle helpers
  function toggleSelectAll() {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Download Sample Template (.csv or .xlsx)
  function downloadSampleTemplate(format: "xlsx" | "csv" = "xlsx") {
    const sampleData = [
      { platform: "fb", full_name: "Ritu Singh", whatsapp_number: "+918178740947" },
      { platform: "ig", full_name: "Aadivasi Arvind", whatsapp_number: "+916264140138" },
      { platform: "fb", full_name: "Banty Solanki", whatsapp_number: "+918829856865" },
      { platform: "ig", full_name: "Nitish Nitish Kumar Nitish", whatsapp_number: "+919065321423" },
      { platform: "ig", full_name: "Bittu Kumeti", whatsapp_number: "+919098673077" },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    if (format === "csv") {
      XLSX.writeFile(wb, "crm_leads_sample_template.csv", { bookType: "csv" });
    } else {
      XLSX.writeFile(wb, "crm_leads_sample_template.xlsx");
    }
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all ${
            toastMessage.type === "success"
              ? "bg-zinc-900 text-emerald-400 border border-emerald-500/30"
              : "bg-red-950 text-red-200 border border-red-500/40"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">Excel &amp; CSV Lead Ingestion</h1>
            <span className="rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 border border-rose-200">
              .csv / .xls / .xlsx
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Upload .csv or Excel spreadsheets with automatic duplicate detection. Extracted leads can be assigned directly to any user&apos;s Initial CRM stage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => downloadSampleTemplate("xlsx")}
              className="px-2.5 py-1 text-xs font-bold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition whitespace-nowrap cursor-pointer"
              title="Download sample Excel (.xlsx) template"
            >
              Sample .xlsx
            </button>
            <span className="text-zinc-300">|</span>
            <button
              onClick={() => downloadSampleTemplate("csv")}
              className="px-2.5 py-1 text-xs font-bold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition whitespace-nowrap cursor-pointer"
              title="Download sample CSV (.csv) template"
            >
              Sample .csv
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:from-rose-500 hover:to-rose-400 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            Upload File
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Uploaded</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-zinc-900">{counts.total}</span>
            <span className="text-[11px] text-zinc-400 font-medium">leads</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Assignment</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-900">{counts.pending}</span>
            <span className="text-[11px] text-amber-600 font-bold">in queue</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Assigned to Users</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-900">{counts.assigned}</span>
            <span className="text-[11px] text-emerald-600 font-bold">in CRM</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Available Users</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-zinc-900">{users.length}</span>
            <span className="text-[11px] text-zinc-400 font-medium">accounts</span>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone Card (Supports .csv, .xls, .xlsx) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) parseExcelFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? "border-rose-500 bg-rose-50/60 scale-[1.005]"
            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 shadow-2xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="mx-auto flex h-10 w-28 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
          Upload
        </div>

        <h3 className="mt-3 text-xs sm:text-sm font-bold text-zinc-900">
          {isUploading ? "Reading and analyzing file..." : "Click or drag and drop .csv, .xls, or .xlsx file"}
        </h3>
        <p className="mt-1 text-[11px] sm:text-xs text-zinc-400">
          Extracts <span className="font-semibold text-zinc-700">platform</span> (fb / ig),{" "}
          <span className="font-semibold text-zinc-700">full_name</span>, and{" "}
          <span className="font-semibold text-zinc-700">whatsapp_number</span> &middot;{" "}
          <span className="text-emerald-700 font-semibold">Automatic duplicate detection</span>
        </p>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-zinc-200/90 shadow-2xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "all" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            All Leads ({counts.total})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "pending" ? "bg-white text-amber-700 shadow-xs font-bold" : "text-zinc-500 hover:text-amber-700"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab("assigned")}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "assigned" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-zinc-500 hover:text-emerald-700"
            }`}
          >
            Assigned ({counts.assigned})
          </button>
        </div>

        {/* Search & Platform Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:max-w-md">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:bg-white focus:border-rose-400 cursor-pointer"
          >
            <option value="all">All Platforms</option>
            <option value="fb">Facebook (fb)</option>
            <option value="ig">Instagram (ig)</option>
            <option value="other">Other Channels</option>
          </select>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search name, phone, platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-rose-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Bulk Assignment Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-black">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold">leads selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="">Choose User to Assign...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.company || u.email}){u.isLeadPaused ? ` [PAUSED${u.leadPauseReason ? `: ${u.leadPauseReason}` : ""}]` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleBulkAssign(bulkAssignee)}
                disabled={!bulkAssignee || isAssigning}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer whitespace-nowrap"
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>

            <button
              onClick={handleRoundRobinDistribute}
              disabled={isAssigning}
              className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3.5 py-1.5 text-xs font-bold text-emerald-400 transition-all cursor-pointer whitespace-nowrap"
              title="Equally divide selected leads among all users"
            >
              Auto-Distribute
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={isAssigning}
              className="rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 px-3.5 py-1.5 text-xs font-bold text-red-300 transition-all cursor-pointer whitespace-nowrap"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Leads Table with Generous Widths */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="px-5 py-4 min-w-[200px]">Lead Name</th>
                <th className="px-5 py-4 min-w-[170px]">Phone &amp; WhatsApp</th>
                <th className="px-5 py-4 min-w-[110px]">Platform</th>
                <th className="px-5 py-4 min-w-[240px]">Customer Form Answers</th>
                <th className="px-5 py-4 min-w-[180px]">Status</th>
                <th className="px-5 py-4 min-w-[240px]">Assign to User</th>
                <th className="px-5 py-4 min-w-[140px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 font-medium">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-zinc-400">
                    <p className="text-sm font-semibold text-zinc-700">No imported leads found</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Upload a .csv or .xls file to see records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isAssigned = lead.status === "assigned";
                  const selectedUserForThisRow = rowUserSelect[lead.id] || "";

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        selectedIds.has(lead.id) ? "bg-rose-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelectRow(lead.id)}
                          className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer h-4 w-4"
                        />
                      </td>

                      {/* Customer Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br ${grad(
                              lead.name
                            )} text-[11px] font-bold text-white shadow-2xs`}
                          >
                            {initials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 text-sm leading-snug">{lead.name}</p>
                            {lead.fileName && (
                              <p className="text-[11px] text-zinc-400 truncate max-w-[180px]" title={lead.fileName}>
                                {lead.fileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone / WhatsApp */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-zinc-800 tracking-wide">
                            {lead.rawPhone || lead.phone}
                          </span>
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="px-5 py-4">
                        {lead.platform === "fb" || lead.channel === "Facebook" ? (
                          <span className="inline-block rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                            Facebook (fb)
                          </span>
                        ) : lead.platform === "ig" || lead.channel === "Instagram" ? (
                          <span className="inline-block rounded-md bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                            Instagram (ig)
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                            {lead.platform || lead.channel || "Other"}
                          </span>
                        )}
                      </td>

                      {/* Customer Form Answers */}
                      <td className="px-5 py-4">
                        {lead.formNotes ? (
                          <div className="space-y-1.5 max-w-[260px]">
                            <div className="flex flex-wrap gap-1">
                              {lead.state && (
                                <span className="inline-block rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-bold">
                                  {lead.state}
                                </span>
                              )}
                              {lead.city && (
                                <span className="inline-block rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 px-2 py-0.5 text-[10px] font-bold">
                                  {lead.city}
                                </span>
                              )}
                              {lead.neetStatus && (
                                <span className="inline-block rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold">
                                  NEET: {lead.neetStatus}
                                </span>
                              )}
                              {lead.preferredCountry && (
                                <span className="inline-block rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold">
                                  {lead.preferredCountry}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewingAnswersLead(lead)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg px-2.5 py-1 transition cursor-pointer"
                            >
                              <span>📋 View Form Answers</span>
                              <span className="text-[10px] bg-rose-200/70 text-rose-800 rounded-full px-1.5 py-0.2">
                                {lead.formNotes.split("\n").filter((l) => l.trim().length > 0).length}
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">No form answers</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isAssigned ? (
                          <div className="space-y-1">
                            <span className="inline-block rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                              Assigned to {lead.assignedToUserName || "User"}
                            </span>
                            <p className="text-[11px] text-zinc-500 font-medium">
                              Stage: <strong className="text-blue-600 font-semibold">Initial</strong>
                            </p>
                          </div>
                        ) : (
                          <span className="inline-block rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                            Pending Assignment
                          </span>
                        )}
                      </td>

                      {/* Inline User Selector */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedUserForThisRow || (isAssigned ? lead.assignedToUserId || "" : "")}
                            onChange={(e) =>
                              setRowUserSelect((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            className={`w-52 rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none transition-colors cursor-pointer truncate ${
                              isAssigned
                                ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                                : "border-amber-300 bg-amber-50/60 text-zinc-900 focus:bg-white focus:border-rose-500 font-semibold"
                            }`}
                          >
                            <option value="">Select User...</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.company || u.email}){u.isLeadPaused ? ` [PAUSED${u.leadPauseReason ? `: ${u.leadPauseReason}` : ""}]` : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() =>
                              handleAssignSingle(lead, selectedUserForThisRow || lead.assignedToUserId || "")
                            }
                            disabled={!selectedUserForThisRow || isAssigning}
                            className="rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer whitespace-nowrap"
                          >
                            {isAssigned ? "Reassign" : "Assign"}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {isAssigned && lead.assignedToUserId && (
                            <Link
                              href={`/admin/agents/${lead.assignedToUserId}`}
                              className="rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 transition"
                            >
                              View in CRM
                            </Link>
                          )}

                          <button
                            onClick={() => handleDeleteSingle(lead.id)}
                            className="rounded-lg border border-zinc-200 hover:border-red-200 hover:bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-red-600 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5 text-xs text-zinc-500 font-medium">
          <span>
            Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> total leads
          </span>
          <span>
            {counts.pending} pending &middot; {counts.assigned} assigned
          </span>
        </div>
      </div>

      {/* Preview & Deduplication Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-900">Extracted Leads Preview</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  File: <strong className="text-zinc-800">{previewFileName}</strong> &middot;{" "}
                  <strong>{parsedPreview.length}</strong> records parsed
                </p>
              </div>

              {/* Deduplication Summary Pills */}
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold">
                  {previewAnalysis.newCount} New
                </span>
                {previewAnalysis.dupCount > 0 && (
                  <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 text-xs font-bold">
                    {previewAnalysis.dupCount} Duplicates Skipped
                  </span>
                )}
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2 py-1 cursor-pointer ml-2"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content / Preview Table */}
            <div className="p-6 space-y-4">
              <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Platform</th>
                      <th className="px-4 py-2.5">Customer Name</th>
                      <th className="px-4 py-2.5">WhatsApp / Phone</th>
                      <th className="px-4 py-2.5 min-w-[180px]">Customer Form Answers</th>
                      <th className="px-4 py-2.5">Duplicate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {previewAnalysis.analyzed.map((item, idx) => (
                      <tr
                        key={idx}
                        className={item.isDuplicate ? "bg-amber-50/40 text-zinc-400" : "hover:bg-zinc-50"}
                      >
                        <td className="px-4 py-2.5 text-zinc-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                              item.platform === "fb"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : item.platform === "ig"
                                ? "bg-pink-50 text-pink-700 border-pink-200"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {item.platform === "fb" ? "Facebook (fb)" : item.platform === "ig" ? "Instagram (ig)" : item.platform}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 font-bold ${item.isDuplicate ? "text-zinc-500 line-through" : "text-zinc-900"}`}>
                          {item.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-700">{item.rawPhone || item.phone}</td>
                        <td className="px-4 py-2.5 max-w-[260px]">
                          {item.formNotes ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {item.state && (
                                  <span className="inline-block rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 text-[10px] font-bold">
                                    {item.state}
                                  </span>
                                )}
                                {item.city && (
                                  <span className="inline-block rounded bg-sky-50 text-sky-700 border border-sky-200/80 px-1.5 py-0.5 text-[10px] font-bold">
                                    {item.city}
                                  </span>
                                )}
                                {item.neetStatus && (
                                  <span className="inline-block rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold">
                                    NEET: {item.neetStatus}
                                  </span>
                                )}
                                {item.preferredCountry && (
                                  <span className="inline-block rounded bg-purple-50 text-purple-700 border border-purple-200/80 px-1.5 py-0.5 text-[10px] font-bold">
                                    {item.preferredCountry}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingAnswersLead(item)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                              >
                                View {item.formNotes.split("\n").filter(Boolean).length} Answers
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px] italic">No form answers</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.isDuplicate ? (
                            <span className="inline-block rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                              Duplicate ({item.reason})
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              New Lead
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assignment Option during Import */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide">
                  Direct User Assignment (Optional):
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={uploadTargetUserId}
                    onChange={(e) => setUploadTargetUserId(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Keep in Pending Queue (Assign manually later)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        Assign all {previewAnalysis.newCount} new leads directly to: {u.name} ({u.company || u.email}){u.isLeadPaused ? ` [PAUSED${u.leadPauseReason ? `: ${u.leadPauseReason}` : ""}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {uploadTargetUserId
                    ? "New unique leads will be created directly in this user's CRM Initial stage upon confirmation."
                    : "New unique leads will be added to the Pending Queue so you can assign or distribute them individually."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => confirmUploadLeads(uploadTargetUserId)}
                  disabled={isUploading || previewAnalysis.newCount === 0}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-5 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUploading
                    ? "Importing Leads..."
                    : previewAnalysis.newCount === 0
                    ? "All Leads Already Exist (0 New)"
                    : `Confirm & Import ${previewAnalysis.newCount} New Leads`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Answers Viewer Modal */}
      {viewingAnswersLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setViewingAnswersLead(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                    📋
                  </span>
                  <h3 className="text-sm font-black text-zinc-900">
                    Customer Form Answers
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Lead: <strong className="text-zinc-800">{viewingAnswersLead.name}</strong>
                  {viewingAnswersLead.phone ? ` · ${viewingAnswersLead.phone}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingAnswersLead(null)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2 py-1 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2.5">
              {viewingAnswersLead.formNotes ? (
                viewingAnswersLead.formNotes
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((line, idx) => {
                    const clean = line.replace(/^[•\s*-]+/, "").trim();
                    const colonIdx = clean.indexOf(":");
                    if (colonIdx === -1) {
                      return (
                        <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-800 font-medium">
                          • {clean}
                        </div>
                      );
                    }
                    const qRaw = clean.slice(0, colonIdx).trim();
                    const aRaw = clean.slice(colonIdx + 1).trim();
                    return (
                      <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 space-y-0.5">
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          {qRaw}
                        </p>
                        <p className="text-xs font-semibold text-zinc-900">
                          {aRaw}
                        </p>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs text-zinc-400 italic text-center py-6">
                  No customer form answers recorded for this lead.
                </p>
              )}
            </div>

            <div className="border-t border-zinc-100 px-6 py-3 bg-zinc-50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingAnswersLead(null)}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          onClose={() => {
            if (!confirmConfig.isLoading) setConfirmConfig(null);
          }}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant={confirmConfig.variant}
          isLoading={confirmConfig.isLoading}
        />
      )}
    </div>
  );
}
