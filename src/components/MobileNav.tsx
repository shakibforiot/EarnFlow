export function MobileNav() {
  const items = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/#cashout", label: "Cash Out", icon: CashIcon },
    { href: "/about", label: "About", icon: AboutIcon },
    { href: "/contact", label: "Contact", icon: OfferIcon },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-950/95 backdrop-blur-xl md:hidden safe-pb"
      aria-label="Mobile"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
        {items.map((item) => (
          <li key={item.href} className="min-w-0 flex-1">
            <a
              href={item.href}
              className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/5 hover:text-cyan-300 sm:text-[11px]"
            >
              <item.icon />
              <span className="truncate">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function OfferIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16v12H4V7zm4-3h8l1 3H7l1-3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
