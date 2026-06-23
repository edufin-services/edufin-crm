import Link from "next/link";
import Logo from "./components/Logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 sm:px-12">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:px-12">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          AI CRM for sales &amp; messaging automation
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Turn every chat into a customer
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-500">
          Manage WhatsApp, Instagram, and TikTok conversations, automate follow-ups, and track
          every deal — all from one inbox.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Get started for free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Log in to your account
          </Link>
        </div>
      </main>
    </div>
  );
}
