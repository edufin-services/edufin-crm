import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { type Channel } from "@/lib/constants";
import {
  createImportedLeads,
  deleteImportedLead,
  deleteImportedLeads,
  getAllUsers,
  getImportedLeads,
} from "@/lib/db";
import {
  cleanPhoneNumber,
  extractLeadFromRow,
  normalizePlatform,
  type ExtractedLeadRow,
} from "@/lib/lead-parser";
import { getSession } from "@/lib/session";

function extractRowsFromWorkbook(buffer: ArrayBuffer | Buffer, fileName: string = ""): ExtractedLeadRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const parsedLeads: ExtractedLeadRow[] = [];
  for (const row of rawRows) {
    const lead = extractLeadFromRow(row, fileName);
    if (lead) parsedLeads.push(lead);
  }

  return parsedLeads;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const [leads, users] = await Promise.all([
    getImportedLeads(status ? { status } : undefined),
    getAllUsers(),
  ]);

  return NextResponse.json({
    leads,
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, company: u.company })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";

  let leadsToInsert: ExtractedLeadRow[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided in form-data." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    leadsToInsert = extractRowsFromWorkbook(buffer, file.name);
  } else {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    if (Array.isArray(body.leads)) {
      leadsToInsert = body.leads
        .map((l: any) => {
          // If the item already has parsed form answers / fields
          if (l.formNotes !== undefined || l.email !== undefined || l.city !== undefined) {
            const { clean, raw } = cleanPhoneNumber(l.phone || l.rawPhone || l.whatsapp_number || l.number || l.mobile);
            const { platform, channel } = normalizePlatform(l.platform || l.channel || l.source);
            return {
              name: String(l.name || l.full_name || "Unnamed Lead").trim(),
              phone: clean || raw || "—",
              rawPhone: raw,
              platform,
              channel,
              email: l.email || undefined,
              city: l.city || undefined,
              state: l.state || undefined,
              neetStatus: l.neetStatus || undefined,
              preferredCountry: l.preferredCountry || undefined,
              formNotes: l.formNotes || undefined,
              notes: l.notes || undefined,
              fileName: String(l.fileName || body.fileName || "manual_upload.xls"),
            };
          }
          // If raw row is passed
          return extractLeadFromRow(l, body.fileName || "manual_upload.xls");
        })
        .filter(Boolean) as ExtractedLeadRow[];
    }
  }

  if (leadsToInsert.length === 0) {
    return NextResponse.json(
      { error: "No valid lead rows found in the uploaded file. Please ensure columns include name, phone/whatsapp, and platform." },
      { status: 400 }
    );
  }

  const result = await createImportedLeads(leadsToInsert);
  return NextResponse.json({
    success: true,
    count: result.created.length,
    skippedCount: result.skippedCount,
    duplicates: result.duplicates,
    leads: result.created,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    await deleteImportedLead(id);
    return NextResponse.json({ success: true });
  }

  const body = await request.json().catch(() => null);
  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    const count = await deleteImportedLeads(body.ids);
    return NextResponse.json({ success: true, deletedCount: count });
  }

  return NextResponse.json({ error: "Invalid delete parameters." }, { status: 400 });
}
