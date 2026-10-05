import Link from "next/link";
import Image from "next/image";

export default function Logo({
  className = "",
  dark = false,
  compact = false,
  imgClassName = "h-9 max-w-[135px] w-auto object-contain",
}: {
  className?: string;
  dark?: boolean;
  compact?: boolean;
  imgClassName?: string;
}) {
  if (compact) {
    return (
      <Link href="/dashboard" className={`flex items-center justify-center ${className}`} title="EduFin CRM">
        <Image
          src="/logo-icon.png"
          alt="EduFin"
          width={32}
          height={32}
          className="h-8 w-8 object-contain rounded-xl shadow-xs"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold ${className}`}>
      <Image
        src={dark ? "/logo.png" : "/logo-light.png"}
        alt="EduFin Services"
        width={160}
        height={70}
        className={imgClassName}
        priority
      />
    </Link>
  );
}
