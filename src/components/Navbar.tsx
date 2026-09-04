"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { useAuthModal } from "./auth/AuthProvider";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { openAuth } = useAuthModal();

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-ink-950/90 backdrop-blur-xl">
      <div className="container-max section-pad flex h-14 items-center justify-between sm:h-16">
        <Logo href="/" />

        <nav className="hidden items-center gap-4 lg:gap-6 md:flex" aria-label="Primary">
          <Link href="/#offers" className="text-sm text-slate-300 hover:text-white">
            Offers
          </Link>
          <Link
            href="/#cashout"
            className="hidden text-sm text-slate-300 hover:text-white lg:inline"
          >
            Cash Out
          </Link>
          <Link
            href="/#streak"
            className="hidden text-sm text-slate-300 hover:text-white lg:inline"
          >
            Rewards
          </Link>
          <Link href="/about" className="text-sm text-slate-300 hover:text-white">
            About
          </Link>
          <Link href="/contact" className="text-sm text-slate-300 hover:text-white">
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => openAuth("signup")}>
            Sign Up
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-ink-900 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/#offers"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              Offers
            </Link>
            <Link
              href="/#cashout"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              Cash Out
            </Link>
            <Link
              href="/#streak"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              Rewards
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              Contact
            </Link>
            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
            >
              Terms
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                openAuth("login");
              }}
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setOpen(false);
                openAuth("signup");
              }}
            >
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
