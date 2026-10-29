import { redirect } from "next/navigation";
import { getAllUsers, getExistingLeadContacts, getImportedLeads } from "@/lib/db";
import { getSession } from "@/lib/session";
import ImportLeadsClient from "./ImportLeadsClient";

export const dynamic = "force-dynamic";

export default async function AdminImportLeadsPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const [importedLeads, users, existingContacts] = await Promise.all([
    getImportedLeads(),
    getAllUsers(),
    getExistingLeadContacts(),
  ]);

  const sanitizedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || "CRM User",
    isLeadPaused: !!u.isLeadPaused,
    leadPauseReason: u.leadPauseReason || "",
  }));

  return (
    <ImportLeadsClient
      initialLeads={importedLeads}
      users={sanitizedUsers}
      existingContacts={existingContacts}
    />
  );
}
