import Logo from "../components/Logo";

const HIGHLIGHTS = [
  "Unify WhatsApp, Meta Ads & student inquiries in one unified inbox",
  "Automate counseling follow-ups with smart reminders & workflows",
  "Track every student from first inquiry to admission & visa documents",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 p-12 text-white lg:flex">
        <div>
          <Logo dark imgClassName="h-11 w-auto object-contain" />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            The AI CRM built for education &amp; admissions leads
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-emerald-100">
                <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/15">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-emerald-200/80">
          Trusted by education consultants, counselors &amp; admissions teams.
        </p>

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10" />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Logo imgClassName="h-10 w-auto object-contain" />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
