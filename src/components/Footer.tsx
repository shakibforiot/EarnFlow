import Link from "next/link";
import { Logo } from "./Logo";

const product = [
  { href: "/#offers", label: "Offers" },
  { href: "/#cashout", label: "Cash Out" },
  { href: "/#streak", label: "Rewards" },
  { href: "/about", label: "About" },
];

const legal = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookies Policy" },
];

const support = [
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Sign Up" },
];

export function Footer({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <footer className="relative z-10 mt-auto border-t border-white/8 bg-ink-950/90 pb-8 pt-8 md:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo href="/" />
              <span className="hidden text-xs text-slate-500 sm:inline">
                1,000 coins = $1
              </span>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
              <Link href="/about" className="transition hover:text-cyan-300">
                About
              </Link>
              <Link href="/terms" className="transition hover:text-cyan-300">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-cyan-300">
                Privacy
              </Link>
              <Link href="/contact" className="transition hover:text-cyan-300">
                Contact
              </Link>
              <Link href="/cookies" className="transition hover:text-cyan-300">
                Cookies
              </Link>
            </nav>
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            © {new Date().getFullYear()} EarnFlow. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-ink-950/80 pb-10 pt-14">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl animate-pulse-soft"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl animate-float"
        aria-hidden
      />

      <div className="container-max section-pad relative">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-sm animate-fade-up">
            <Logo href="/" />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Earn rewards by completing tasks, surveys, and offers — then cash
              out through available methods. Built for clarity and fair payouts.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan-400" />
              Rate: 1,000 coins = $1.00 USD
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
              <h3 className="text-sm font-semibold text-white">Product</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {product.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="transition hover:text-cyan-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
              <h3 className="text-sm font-semibold text-white">Legal</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {legal.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition hover:text-cyan-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
              <h3 className="text-sm font-semibold text-white">Support</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {support.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition hover:text-cyan-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} EarnFlow. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-cyan-300">
              About
            </Link>
            <Link href="/terms" className="hover:text-cyan-300">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-cyan-300">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-cyan-300">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
