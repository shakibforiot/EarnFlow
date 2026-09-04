import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className = "", href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="EarnFlow home"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-400/30">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M5 16c3-7 6-10 7-10s4 3 7 10"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="8" r="2" fill="#34d399" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight">
        Earn<span className="text-cyan-400">Flow</span>
      </span>
    </Link>
  );
}
