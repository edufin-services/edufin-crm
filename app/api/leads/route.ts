import { NextRequest, NextResponse } from "next/server";
import { CHANNELS, STAGES } from "@/lib/constants";
import { createLead, getAllLeads, getLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId && !session?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let leads = session.isAdmin ? await getAllLeads() : await getLeadsByOwner(session.userId!);

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) => l.name.toLowerCase().includes(q));
  }

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const body = await request.json().catch(() => null);
  const ownerId = (session?.isAdmin && body?.ownerId) ? body.ownerId : (session?.userId || (session?.isAdmin ? "admin" : null));
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    name, channel, stage, phone, services, notes, email, value, city, state,
    neetStatus, preferredCountry, preferredUniversity1, preferredUniversity2,
    assignAgent, firstPayment, secondPayment, thirdPaymentAmount, otcAmount, totalServiceCharge,
  } = body ?? {};
  const cleanPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";

  if (
    typeof name !== "string" || !name.trim() ||
    !CHANNELS.includes(channel) ||
    !STAGES.includes(stage) ||
    cleanPhone.length !== 10
  ) {
    return NextResponse.json({ error: "Please enter a valid name, channel, stage, and 10-digit phone number." }, { status: 400 });
  }

  const lead = await createLead({
    ownerId,
    name: name.trim(),
    channel,
    value: typeof value === "number" && value >= 0 ? value : 0,
    stage,
    phone: cleanPhone,
    email: typeof email === "string" ? email.trim() : undefined,
    city: typeof city === "string" ? city.trim() : undefined,
    state: typeof state === "string" ? state.trim() : undefined,
    services: Array.isArray(services) ? services : [],
    notes: typeof notes === "string" ? notes : "",
    neetStatus: typeof neetStatus === "string" ? neetStatus : undefined,
    preferredCountry: typeof preferredCountry === "string" ? preferredCountry : undefined,
    preferredUniversity1: typeof preferredUniversity1 === "string" ? preferredUniversity1 : undefined,
    preferredUniversity2: typeof preferredUniversity2 === "string" ? preferredUniversity2 : undefined,
    assignAgent: typeof assignAgent === "string" ? assignAgent : undefined,
    firstPayment: typeof firstPayment === "number" ? firstPayment : Number(firstPayment) || 0,
    secondPayment: typeof secondPayment === "number" ? secondPayment : Number(secondPayment) || 0,
    thirdPaymentAmount: typeof thirdPaymentAmount === "number" ? thirdPaymentAmount : Number(thirdPaymentAmount) || 0,
    otcAmount: typeof otcAmount === "number" ? otcAmount : Number(otcAmount) || 0,
    totalServiceCharge: typeof totalServiceCharge === "number" ? totalServiceCharge : Number(totalServiceCharge) || 0,
  });
  return NextResponse.json({ lead });
}
