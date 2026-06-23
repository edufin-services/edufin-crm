import { MailIcon } from "../icons";

export default function MailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Mail</h1>
        <p className="mt-1 text-sm text-zinc-500">Connect an email inbox to send and receive messages from your CRM.</p>
      </div>

      <div className="flex h-[calc(100vh-14rem)] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailIcon />
        </span>
        <h2 className="mt-4 text-base font-semibold text-zinc-900">No inbox connected</h2>
        <p className="mt-1 max-w-sm text-center text-sm text-zinc-500">
          Connect your email account to manage conversations alongside your other channels.
        </p>
        <button className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Connect inbox
        </button>
      </div>
    </div>
  );
}
