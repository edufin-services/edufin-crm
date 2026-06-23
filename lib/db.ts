import "server-only";
import fs from "fs";
import path from "path";
import { Channel, Stage } from "./constants";

type User = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companyTimezone?: string;
  channels?: Record<string, boolean>;
  notificationPrefs?: Record<string, boolean>;
  notificationsReadAt?: string;
};

export type Notification = {
  id: string;
  type: "lead" | "message" | "task";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

type ResetToken = {
  token: string;
  userId: string;
  expiresAt: string;
};

export type Lead = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  channel: Channel;
  value: number;
  stage: Stage;
  createdAt: string;
  whatsappId?: string;
};

export type Conversation = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  channel: Channel;
  preview: string;
  unread: number;
  updatedAt: string;
  whatsappId?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  ownerId: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
};

export type Task = {
  id: string;
  ownerId: string;
  title: string;
  contact: string;
  type: "call" | "email" | "meeting" | "message";
  dueDate: string;
  done: boolean;
};

export type Contact = {
  id: string;
  ownerId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: Channel;
  tags: string[];
  createdAt: string;
};

export type TeamMember = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  role: string;
};

type DbShape = {
  users: User[];
  resetTokens: ResetToken[];
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  tasks: Task[];
  contacts: Contact[];
  teamMembers: TeamMember[];
};

export const DEFAULT_CHANNELS: Record<string, boolean> = {
  WhatsApp: true,
  Instagram: true,
  TikTok: false,
  Email: true,
};

export const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  "New lead assigned to me": true,
  "New message in inbox": true,
  "Task due reminders": true,
  "Weekly performance summary": false,
  "Product updates & tips": false,
};

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDb(): DbShape {
  return {
    users: [],
    resetTokens: [],
    leads: [],
    conversations: [],
    messages: [],
    tasks: [],
    contacts: [],
    teamMembers: [],
  };
}

function readDb(): DbShape {
  if (!fs.existsSync(DB_PATH)) {
    return emptyDb();
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  if (!raw.trim()) {
    return emptyDb();
  }
  return { ...emptyDb(), ...(JSON.parse(raw) as Partial<DbShape>) };
}

function writeDb(data: DbShape) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Users / Account

export function getUserByEmail(email: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function createUser(user: Omit<User, "id" | "createdAt">): User {
  const db = readDb();
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function updateUserPassword(userId: string, passwordHash: string) {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  user.passwordHash = passwordHash;
  writeDb(db);
}

export function updateUserProfile(userId: string, updates: Partial<Pick<User, "name" | "email" | "phone">>): User | undefined {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return undefined;
  Object.assign(user, updates);
  writeDb(db);
  return user;
}

export function updateCompanyInfo(
  userId: string,
  updates: Partial<Pick<User, "company" | "companyWebsite" | "companyIndustry" | "companyTimezone">>
): User | undefined {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return undefined;
  Object.assign(user, updates);
  writeDb(db);
  return user;
}

export function getUserChannels(userId: string): Record<string, boolean> {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  return { ...DEFAULT_CHANNELS, ...(user?.channels ?? {}) };
}

export function setUserChannel(userId: string, channel: string, connected: boolean): Record<string, boolean> {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return DEFAULT_CHANNELS;
  user.channels = { ...DEFAULT_CHANNELS, ...(user.channels ?? {}), [channel]: connected };
  writeDb(db);
  return user.channels;
}

export function getNotificationPrefs(userId: string): Record<string, boolean> {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notificationPrefs ?? {}) };
}

export function setNotificationPrefs(userId: string, prefs: Record<string, boolean>): Record<string, boolean> {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return DEFAULT_NOTIFICATION_PREFS;
  user.notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs ?? {}), ...prefs };
  writeDb(db);
  return user.notificationPrefs;
}

export function getNotifications(userId: string): Notification[] {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notificationPrefs ?? {}) };
  const readAt = user?.notificationsReadAt ? new Date(user.notificationsReadAt).getTime() : 0;
  const now = Date.now();

  const notifications: Notification[] = [];

  if (prefs["New lead assigned to me"]) {
    const recentLeads = db.leads.filter(
      (l) => l.ownerId === userId && now - new Date(l.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    );
    for (const lead of recentLeads) {
      notifications.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: `New lead: ${lead.name}`,
        message: `${lead.company} · ${lead.channel} · ${lead.stage}`,
        href: "/dashboard/leads",
        createdAt: lead.createdAt,
        read: new Date(lead.createdAt).getTime() <= readAt,
      });
    }
  }

  if (prefs["New message in inbox"]) {
    const unreadConversations = db.conversations.filter((c) => c.ownerId === userId && c.unread > 0);
    for (const conv of unreadConversations) {
      notifications.push({
        id: `message-${conv.id}`,
        type: "message",
        title: `New message from ${conv.name}`,
        message: conv.preview,
        href: "/dashboard/chats",
        createdAt: conv.updatedAt,
        read: new Date(conv.updatedAt).getTime() <= readAt,
      });
    }
  }

  if (prefs["Task due reminders"]) {
    const dueTasks = db.tasks.filter(
      (t) => t.ownerId === userId && !t.done && new Date(t.dueDate).getTime() <= now
    );
    for (const task of dueTasks) {
      notifications.push({
        id: `task-${task.id}`,
        type: "task",
        title: `Task due: ${task.title}`,
        message: task.contact,
        href: "/dashboard/calendar",
        createdAt: task.dueDate,
        read: new Date(task.dueDate).getTime() <= readAt,
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationsRead(userId: string): string {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  const now = new Date().toISOString();
  if (user) {
    user.notificationsReadAt = now;
    writeDb(db);
  }
  return now;
}

// Password reset tokens

export function createResetToken(userId: string): ResetToken {
  const db = readDb();
  // Remove any existing tokens for this user
  db.resetTokens = db.resetTokens.filter((t) => t.userId !== userId);
  const token: ResetToken = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
  };
  db.resetTokens.push(token);
  writeDb(db);
  return token;
}

export function getResetToken(token: string): ResetToken | undefined {
  const db = readDb();
  const found = db.resetTokens.find((t) => t.token === token);
  if (!found) return undefined;
  if (new Date(found.expiresAt).getTime() < Date.now()) return undefined;
  return found;
}

export function deleteResetToken(token: string) {
  const db = readDb();
  db.resetTokens = db.resetTokens.filter((t) => t.token !== token);
  writeDb(db);
}

// Leads / Deals

export function getLeadsByOwner(ownerId: string): Lead[] {
  const db = readDb();
  return db.leads.filter((l) => l.ownerId === ownerId);
}

export function createLead(lead: Omit<Lead, "id" | "createdAt">): Lead {
  const db = readDb();
  const newLead: Lead = {
    ...lead,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.leads.push(newLead);
  writeDb(db);
  return newLead;
}

export function updateLead(id: string, ownerId: string, updates: Partial<Pick<Lead, "stage" | "value" | "name" | "company" | "channel">>): Lead | undefined {
  const db = readDb();
  const lead = db.leads.find((l) => l.id === id && l.ownerId === ownerId);
  if (!lead) return undefined;
  Object.assign(lead, updates);
  writeDb(db);
  return lead;
}

export function deleteLead(id: string, ownerId: string) {
  const db = readDb();
  db.leads = db.leads.filter((l) => !(l.id === id && l.ownerId === ownerId));
  writeDb(db);
}

// Contacts

export function getContactsByOwner(ownerId: string): Contact[] {
  const db = readDb();
  return db.contacts.filter((c) => c.ownerId === ownerId);
}

export function createContact(contact: Omit<Contact, "id" | "createdAt">): Contact {
  const db = readDb();
  const newContact: Contact = {
    ...contact,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.contacts.push(newContact);
  writeDb(db);
  return newContact;
}

export function updateContact(id: string, ownerId: string, updates: Partial<Pick<Contact, "name" | "company" | "email" | "phone" | "channel" | "tags">>): Contact | undefined {
  const db = readDb();
  const contact = db.contacts.find((c) => c.id === id && c.ownerId === ownerId);
  if (!contact) return undefined;
  Object.assign(contact, updates);
  writeDb(db);
  return contact;
}

export function deleteContact(id: string, ownerId: string) {
  const db = readDb();
  db.contacts = db.contacts.filter((c) => !(c.id === id && c.ownerId === ownerId));
  writeDb(db);
}

// Conversations & Messages

export function getConversationsByOwner(ownerId: string): Conversation[] {
  const db = readDb();
  return db.conversations.filter((c) => c.ownerId === ownerId);
}

export function getConversationById(id: string, ownerId: string): Conversation | undefined {
  const db = readDb();
  return db.conversations.find((c) => c.id === id && c.ownerId === ownerId);
}

export function getConversationByWhatsappId(ownerId: string, whatsappId: string): Conversation | undefined {
  const db = readDb();
  return db.conversations.find((c) => c.ownerId === ownerId && c.whatsappId === whatsappId);
}

export function getLeadByWhatsappId(ownerId: string, whatsappId: string): Lead | undefined {
  const db = readDb();
  return db.leads.find((l) => l.ownerId === ownerId && l.whatsappId === whatsappId);
}

export function createConversation(conversation: Omit<Conversation, "id">): Conversation {
  const db = readDb();
  const newConversation: Conversation = {
    ...conversation,
    id: crypto.randomUUID(),
  };
  db.conversations.push(newConversation);
  writeDb(db);
  return newConversation;
}

export function getMessagesByConversation(conversationId: string, ownerId: string): Message[] {
  const db = readDb();
  return db.messages.filter((m) => m.conversationId === conversationId && m.ownerId === ownerId);
}

export function createMessage(conversationId: string, ownerId: string, from: "me" | "them", text: string): Message | undefined {
  const db = readDb();
  const conversation = db.conversations.find((c) => c.id === conversationId && c.ownerId === ownerId);
  if (!conversation) return undefined;

  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    ownerId,
    from,
    text,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);

  conversation.preview = text;
  conversation.updatedAt = message.createdAt;
  if (from === "them") {
    conversation.unread += 1;
  } else {
    conversation.unread = 0;
  }

  writeDb(db);
  return message;
}

export function markConversationRead(id: string, ownerId: string) {
  const db = readDb();
  const conversation = db.conversations.find((c) => c.id === id && c.ownerId === ownerId);
  if (!conversation) return;
  conversation.unread = 0;
  writeDb(db);
}

// Tasks

export function getTasksByOwner(ownerId: string): Task[] {
  const db = readDb();
  return db.tasks.filter((t) => t.ownerId === ownerId);
}

export function createTask(task: Omit<Task, "id">): Task {
  const db = readDb();
  const newTask: Task = { ...task, id: crypto.randomUUID() };
  db.tasks.push(newTask);
  writeDb(db);
  return newTask;
}

export function updateTask(id: string, ownerId: string, updates: Partial<Pick<Task, "title" | "contact" | "type" | "dueDate" | "done">>): Task | undefined {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === id && t.ownerId === ownerId);
  if (!task) return undefined;
  Object.assign(task, updates);
  writeDb(db);
  return task;
}

export function deleteTask(id: string, ownerId: string) {
  const db = readDb();
  db.tasks = db.tasks.filter((t) => !(t.id === id && t.ownerId === ownerId));
  writeDb(db);
}

// Team members

export function getTeamMembers(ownerId: string): TeamMember[] {
  const db = readDb();
  return db.teamMembers.filter((m) => m.ownerId === ownerId);
}

export function createTeamMember(member: Omit<TeamMember, "id">): TeamMember {
  const db = readDb();
  const newMember: TeamMember = { ...member, id: crypto.randomUUID() };
  db.teamMembers.push(newMember);
  writeDb(db);
  return newMember;
}

export function deleteTeamMember(id: string, ownerId: string) {
  const db = readDb();
  db.teamMembers = db.teamMembers.filter((m) => !(m.id === id && m.ownerId === ownerId));
  writeDb(db);
}

// Seed sample data for a newly created account

export function seedAccountData(ownerId: string) {
  const db = readDb();
  const now = Date.now();
  const isoDaysAgo = (days: number, hours = 0) =>
    new Date(now - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000).toISOString();
  const todayAt = (hour: number) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const sampleLeads: Lead[] = [
    { id: crypto.randomUUID(), ownerId, name: "David Kim", company: "Northwind", channel: "WhatsApp", value: 2100, stage: "Initial Contact", createdAt: isoDaysAgo(0, 1) },
    { id: crypto.randomUUID(), ownerId, name: "Lena Fischer", company: "Orbit Labs", channel: "Instagram", value: 3400, stage: "Initial Contact", createdAt: isoDaysAgo(1) },
    { id: crypto.randomUUID(), ownerId, name: "Tom Becker", company: "Greenfield", channel: "Email", value: 1200, stage: "Connected", createdAt: isoDaysAgo(2) },
    { id: crypto.randomUUID(), ownerId, name: "Marco Rossi", company: "Verde Foods", channel: "Instagram", value: 1850, stage: "Interested", createdAt: isoDaysAgo(0, 2) },
    { id: crypto.randomUUID(), ownerId, name: "Yuki Sato", company: "Hanabi Co.", channel: "TikTok", value: 5000, stage: "Proposal", createdAt: isoDaysAgo(3) },
    { id: crypto.randomUUID(), ownerId, name: "Sarah Mitchell", company: "Brightline Co.", channel: "WhatsApp", value: 4200, stage: "Registration", createdAt: isoDaysAgo(0, 4) },
    { id: crypto.randomUUID(), ownerId, name: "Omar Haddad", company: "Dune Retail", channel: "Email", value: 7600, stage: "Admission Letter", createdAt: isoDaysAgo(4) },
    { id: crypto.randomUUID(), ownerId, name: "Aiko Tanaka", company: "Loop Studio", channel: "TikTok", value: 6400, stage: "2nd Payment", createdAt: isoDaysAgo(0, 6) },
    { id: crypto.randomUUID(), ownerId, name: "Priya Nair", company: "Solace Health", channel: "Email", value: 9300, stage: "Invitation", createdAt: isoDaysAgo(5) },
    { id: crypto.randomUUID(), ownerId, name: "Carlos Diaz", company: "Fenix Sports", channel: "WhatsApp", value: 3950, stage: "Visa Process", createdAt: isoDaysAgo(6) },
  ];

  const conv1 = crypto.randomUUID();
  const conv2 = crypto.randomUUID();
  const conv3 = crypto.randomUUID();
  const conv4 = crypto.randomUUID();
  const conv5 = crypto.randomUUID();

  const sampleConversations: Conversation[] = [
    { id: conv1, ownerId, name: "Sarah Mitchell", company: "Brightline Co.", channel: "WhatsApp", preview: "Thanks, can you send the updated quote?", unread: 2, updatedAt: isoDaysAgo(0, 0.05) },
    { id: conv2, ownerId, name: "Marco Rossi", company: "Verde Foods", channel: "Instagram", preview: "Is this still available in blue?", unread: 1, updatedAt: isoDaysAgo(0, 0.3) },
    { id: conv3, ownerId, name: "Aiko Tanaka", company: "Loop Studio", channel: "TikTok", preview: "We'd like to move forward with the deal.", unread: 0, updatedAt: isoDaysAgo(0, 1) },
    { id: conv4, ownerId, name: "David Kim", company: "Northwind", channel: "WhatsApp", preview: "Sounds good, talk soon!", unread: 0, updatedAt: isoDaysAgo(0, 3) },
    { id: conv5, ownerId, name: "Priya Nair", company: "Solace Health", channel: "Email", preview: "Invoice received, thank you!", unread: 0, updatedAt: isoDaysAgo(1) },
  ];

  const sampleMessages: Message[] = [
    { id: crypto.randomUUID(), conversationId: conv1, ownerId, from: "them", text: "Hi! I saw your post about the new collection.", createdAt: isoDaysAgo(0, 5) },
    { id: crypto.randomUUID(), conversationId: conv1, ownerId, from: "me", text: "Hi Sarah! Yes, it just launched. Want me to send the catalog?", createdAt: isoDaysAgo(0, 4.8) },
    { id: crypto.randomUUID(), conversationId: conv1, ownerId, from: "them", text: "Yes please, and pricing for bulk orders too.", createdAt: isoDaysAgo(0, 4.7) },
    { id: crypto.randomUUID(), conversationId: conv1, ownerId, from: "me", text: "Sure — sending the quote now.", createdAt: isoDaysAgo(0, 4) },
    { id: crypto.randomUUID(), conversationId: conv1, ownerId, from: "them", text: "Thanks, can you send the updated quote?", createdAt: isoDaysAgo(0, 0.05) },

    { id: crypto.randomUUID(), conversationId: conv2, ownerId, from: "them", text: "Hey, saw your story — is this still available in blue?", createdAt: isoDaysAgo(0, 0.6) },
    { id: crypto.randomUUID(), conversationId: conv2, ownerId, from: "me", text: "Yes! We have it in stock. Want me to reserve one for you?", createdAt: isoDaysAgo(0, 0.3) },

    { id: crypto.randomUUID(), conversationId: conv3, ownerId, from: "them", text: "Our team reviewed the proposal.", createdAt: isoDaysAgo(0, 1.2) },
    { id: crypto.randomUUID(), conversationId: conv3, ownerId, from: "them", text: "We'd like to move forward with the deal.", createdAt: isoDaysAgo(0, 1.1) },
    { id: crypto.randomUUID(), conversationId: conv3, ownerId, from: "me", text: "That's great news! I'll send the contract over today.", createdAt: isoDaysAgo(0, 1) },

    { id: crypto.randomUUID(), conversationId: conv4, ownerId, from: "me", text: "Hi David, following up on our call earlier.", createdAt: isoDaysAgo(0, 3.2) },
    { id: crypto.randomUUID(), conversationId: conv4, ownerId, from: "them", text: "Sounds good, talk soon!", createdAt: isoDaysAgo(0, 3) },

    { id: crypto.randomUUID(), conversationId: conv5, ownerId, from: "me", text: "Hi Priya, here's the invoice for this month.", createdAt: isoDaysAgo(1, 1) },
    { id: crypto.randomUUID(), conversationId: conv5, ownerId, from: "them", text: "Invoice received, thank you!", createdAt: isoDaysAgo(1) },
  ];

  const sampleTasks: Task[] = [
    { id: crypto.randomUUID(), ownerId, title: "Follow-up call about pricing", contact: "Sarah Mitchell · Brightline Co.", type: "call", dueDate: todayAt(11), done: false },
    { id: crypto.randomUUID(), ownerId, title: "Reply to Instagram inquiry", contact: "Marco Rossi · Verde Foods", type: "message", dueDate: todayAt(13), done: false },
    { id: crypto.randomUUID(), ownerId, title: "Demo call with procurement team", contact: "Aiko Tanaka · Loop Studio", type: "meeting", dueDate: todayAt(15), done: false },
    { id: crypto.randomUUID(), ownerId, title: "Send signed contract copy", contact: "Priya Nair · Solace Health", type: "email", dueDate: todayAt(17), done: true },
  ];

  const sampleContacts: Contact[] = [
    { id: crypto.randomUUID(), ownerId, name: "Sarah Mitchell", company: "Brightline Co.", email: "sarah@brightline.com", phone: "+1 415 555 0192", channel: "WhatsApp", tags: ["VIP", "Retail"], createdAt: isoDaysAgo(10) },
    { id: crypto.randomUUID(), ownerId, name: "Marco Rossi", company: "Verde Foods", email: "marco@verdefoods.it", phone: "+39 02 5550 1843", channel: "Instagram", tags: ["New"], createdAt: isoDaysAgo(9) },
    { id: crypto.randomUUID(), ownerId, name: "Aiko Tanaka", company: "Loop Studio", email: "aiko@loopstudio.jp", phone: "+81 3 5550 7732", channel: "TikTok", tags: ["Negotiation"], createdAt: isoDaysAgo(8) },
    { id: crypto.randomUUID(), ownerId, name: "David Kim", company: "Northwind", email: "david@northwind.com", phone: "+1 206 555 0148", channel: "WhatsApp", tags: ["New"], createdAt: isoDaysAgo(7) },
    { id: crypto.randomUUID(), ownerId, name: "Priya Nair", company: "Solace Health", email: "priya@solacehealth.com", phone: "+91 98765 43210", channel: "Email", tags: ["VIP", "Won"], createdAt: isoDaysAgo(6) },
    { id: crypto.randomUUID(), ownerId, name: "Lena Fischer", company: "Orbit Labs", email: "lena@orbitlabs.de", phone: "+49 30 5550 9981", channel: "Instagram", tags: ["New"], createdAt: isoDaysAgo(5) },
    { id: crypto.randomUUID(), ownerId, name: "Carlos Diaz", company: "Fenix Sports", email: "carlos@fenixsports.com", phone: "+34 91 555 0173", channel: "WhatsApp", tags: ["Won"], createdAt: isoDaysAgo(4) },
    { id: crypto.randomUUID(), ownerId, name: "Omar Haddad", company: "Dune Retail", email: "omar@duneretail.ae", phone: "+971 4 555 0129", channel: "Email", tags: ["Proposal"], createdAt: isoDaysAgo(3) },
  ];

  db.leads.push(...sampleLeads);
  db.conversations.push(...sampleConversations);
  db.messages.push(...sampleMessages);
  db.tasks.push(...sampleTasks);
  db.contacts.push(...sampleContacts);
  writeDb(db);
}
