import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4h11a5 5 0 0 1 0 10H9l-5 6V4Z"
            fill="currentColor"
          />
          <circle cx="9.5" cy="9" r="1.25" fill="white" />
          <circle cx="13.5" cy="9" r="1.25" fill="white" />
        </svg>
      </span>
      <span className="text-lg tracking-tight text-zinc-900">Pulse CRM</span>
    </Link>
  );
}
