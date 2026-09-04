"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import {
  COUNTRY_LIST,
  dialCodeForCountry,
  isPhoneJustDialCode,
  phonePlaceholderForCountry,
} from "@/lib/countries";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { coinsToUsd } from "@/lib/economy";
import {
  clearSession,
  getSession,
  saveSession,
  type SessionUser,
} from "@/lib/session";
import { detectGeoClient } from "@/lib/detect-country";
import { getCompletenessItems } from "@/lib/profile-complete";
import { isFieldLocked } from "@/lib/profile-locks";
import { xpProgress } from "@/lib/xp";

type Tab = "overview" | "history" | "settings" | "security" | "payouts";

type OfferRow = {
  id: string;
  source: string;
  coins: number;
  createdAt: string;
};

type CashoutRow = {
  id: string;
  method: string;
  coins: number;
  amountUsd: number;
  status: "pending" | "approved" | "rejected";
  giftCode?: string | null;
  createdAt: string;
};

type Summary = {
  totalEarnedCoins: number;
  totalEarnedUsd: number;
  pendingCoins: number;
  pendingUsd: number;
  approvedCoins: number;
  approvedUsd: number;
  offerCount: number;
  cashoutCount: number;
  profileScore: number;
  profileScoreMax: number;
  minCashoutUsd: number;
  cashoutProgress: number;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "security", label: "Security" },
  { id: "payouts", label: "Payouts" },
];

function statusStyle(status: CashoutRow["status"]) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-300";
  if (status === "rejected") return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [geoNote, setGeoNote] = useState("");

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [countryAuto, setCountryAuto] = useState(true);
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("en");
  const [phone, setPhone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [preferredCashout, setPreferredCashout] = useState("PayPal");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notifyOffers, setNotifyOffers] = useState(true);
  const [notifyCashout, setNotifyCashout] = useState(true);
  const [notifyNewsletter, setNotifyNewsletter] = useState(false);
  const [profilePrivate, setProfilePrivate] = useState(false);

  const [verifyCode, setVerifyCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyErr, setVerifyErr] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [offersPage, setOffersPage] = useState(1);
  const [cashoutsPage, setCashoutsPage] = useState(1);

  const HISTORY_PAGE_SIZE = 8;

  const [kycFullName, setKycFullName] = useState("");
  const [kycDob, setKycDob] = useState("");
  const [kycCountry, setKycCountry] = useState("");
  const [kycAddress, setKycAddress] = useState("");
  const [kycCity, setKycCity] = useState("");
  const [kycDocType, setKycDocType] = useState("national_id");
  const [kycIdNumber, setKycIdNumber] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    applyUser(session);
    void loadProfile(session.id);
    try {
      window.localStorage.setItem("earnflow_profile_visited", "1");
    } catch {
      /* ignore */
    }
    // Mount-only: load once from session; loadProfile is stable for this page lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function applyUser(next: SessionUser) {
    setUser(next);
    setName(next.name ?? "");
    setCountry(next.country ?? "");
    setCountryAuto(next.countryAuto ?? true);
    setTimezone(next.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    setLanguage(next.language ?? "en");
    setPhone(next.phone ?? "");
    setPaypalEmail(next.paypalEmail ?? "");
    setCryptoAddress(next.cryptoAddress ?? "");
    setPreferredCashout(next.preferredCashout ?? "PayPal");
    setTwoFactorEnabled(next.twoFactorEnabled ?? false);
    setNotifyOffers(next.notifyOffers ?? true);
    setNotifyCashout(next.notifyCashout ?? true);
    setNotifyNewsletter(next.notifyNewsletter ?? false);
    setProfilePrivate(next.profilePrivate ?? false);
    // If phone empty, seed dial code from country (not hardcoded +880)
    if (!next.phone?.trim() && next.country) {
      const dial = dialCodeForCountry(next.country);
      if (dial && dial !== "+") setPhone(dial);
    }
    setKycFullName(next.kycFullName ?? "");
    setKycDob(next.kycDob ?? "");
    setKycCountry(next.kycCountry || next.country || "");
    setKycAddress(next.kycAddress ?? "");
    setKycCity(next.kycCity ?? "");
    setKycDocType(next.kycDocType || "national_id");
  }

  async function loadProfile(userId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?userId=${userId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) {
        let nextUser = json.user;
        // If country still empty, detect on the client and save
        if (!nextUser.country) {
          const geo = await detectGeoClient();
          if (geo.country) {
            const patch = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                country: geo.country,
                countryAuto: true,
                timezone: geo.timezone || nextUser.timezone,
              }),
            });
            const patched = await patch.json();
            if (patch.ok && patched.user) {
              nextUser = patched.user;
              setGeoNote(`Country auto-selected: ${geo.country}`);
            }
          }
        } else if (nextUser.countryAuto) {
          setGeoNote(`Country auto-detected: ${nextUser.country}`);
        }

        applyUser(nextUser);
        saveSession(nextUser);
        setSummary(json.summary);
        setOffers(json.offers ?? []);
        setCashouts(json.cashouts ?? []);
        setOffersPage(1);
        setCashoutsPage(1);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function detectCountryNow() {
    if (!user) return;
    if (isFieldLocked(user, "country")) {
      setError(
        "Country is locked. Admin must unlock before you can change it.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const geo = await detectGeoClient();
      const nextCountry = geo.country || "";
      const nextTz = geo.timezone || timezone;

      if (!nextCountry) {
        setError(
          "Could not detect country. Select it manually in Settings.",
        );
        setTab("settings");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          country: nextCountry,
          countryAuto: true,
          timezone: nextTz,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Auto-select failed");
        return;
      }
      applyUser(data.user);
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setGeoNote(`Country auto-selected: ${nextCountry} (${geo.source})`);
      flash(`Country set to ${nextCountry}`);
    } catch {
      setError("Auto-select failed. Try Settings → select country.");
    } finally {
      setSaving(false);
    }
  }

  function flash(ok: string, err = "") {
    setMessage(ok);
    setError(err);
    if (ok) setTimeout(() => setMessage(""), 3500);
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name,
          country,
          countryAuto,
          timezone: typeof timezone === "string" ? timezone : "",
          language,
          phone,
          paypalEmail,
          cryptoAddress,
          preferredCashout,
          twoFactorEnabled,
          notifyOffers,
          notifyCashout,
          notifyNewsletter,
          profilePrivate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      applyUser(data.user);
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      flash("Settings saved.");
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  /** Privacy toggle saves immediately (no need to hit Save settings) */
  async function toggleProfilePrivate(next: boolean) {
    if (!user?.id) return;
    const prev = profilePrivate;
    setProfilePrivate(next);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          profilePrivate: next,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfilePrivate(prev);
        setError(data.error || "Could not update private account");
        return;
      }
      if (data.user) {
        applyUser(data.user);
        saveSession(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
      }
      flash(
        next
          ? "Private account on — activity hidden on your public profile."
          : "Private account off — activity visible again.",
      );
    } catch {
      setProfilePrivate(prev);
      setError("Could not update private account. Try again.");
    }
  }

  async function sendVerifyCode() {
    if (!user?.id) {
      setVerifyErr("Session missing. Sign in again.");
      return;
    }
    setVerifyBusy(true);
    setVerifyErr("");
    setVerifyNote("");
    setError("");
    try {
      const res = await fetch("/api/profile/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "send" }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyErr(data.error || "Could not send code");
        return;
      }
      if (data.alreadyVerified && data.user) {
        applyUser(data.user);
        saveSession(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
        setVerifyNote("Email already verified.");
        return;
      }
      const code = String(data.code || "");
      if (!code) {
        setVerifyErr("No code returned. Try again.");
        return;
      }
      setSentCode(code);
      setVerifyCode(code);
      setVerifyNote("Code ready — tap Verify email to confirm.");
    } catch {
      setVerifyErr("Request timed out or failed. Try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function confirmVerify(e?: FormEvent) {
    e?.preventDefault();
    if (!user?.id) {
      setVerifyErr("Session missing. Sign in again.");
      return;
    }
    if (!verifyCode.trim()) {
      setVerifyErr("Enter the 6-digit code first (or Send code).");
      return;
    }
    setVerifyBusy(true);
    setVerifyErr("");
    setVerifyNote("");
    setError("");
    try {
      const res = await fetch("/api/profile/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "confirm",
          code: verifyCode.trim(),
        }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyErr(data.error || "Verification failed");
        return;
      }
      if (data.user) {
        applyUser(data.user);
        saveSession(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
      }
      setVerifyCode("");
      setSentCode("");
      setVerifyNote("Email verified successfully.");
      flash("Email verified successfully.");
      void loadProfile(user.id);
    } catch {
      setVerifyErr("Verification timed out or failed. Try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  /** No SMTP yet — verify email in one tap */
  async function instantVerify() {
    if (!user?.id) {
      setVerifyErr("Session missing. Sign in again.");
      return;
    }
    setVerifyBusy(true);
    setVerifyErr("");
    setVerifyNote("");
    try {
      const res = await fetch("/api/profile/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "instant" }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyErr(data.error || "Verification failed");
        return;
      }
      if (data.user) {
        applyUser(data.user);
        saveSession(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
      }
      setVerifyCode("");
      setSentCode("");
      setVerifyNote("Email verified successfully.");
      flash("Email verified successfully.");
      void loadProfile(user.id);
    } catch {
      setVerifyErr("Verification timed out or failed. Try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Password change failed");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      flash("Password updated.");
    } catch {
      setError("Password change failed.");
    } finally {
      setSaving(false);
    }
  }

  async function startKyc(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    if (
      !kycFullName.trim() ||
      !kycDob.trim() ||
      !kycCountry.trim() ||
      !kycAddress.trim() ||
      !kycCity.trim() ||
      !kycDocType.trim() ||
      !kycIdNumber.trim()
    ) {
      setError("Fill every KYC field, including ID number at the bottom.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          fullName: kycFullName,
          dateOfBirth: kycDob,
          country: kycCountry,
          address: kycAddress,
          city: kycCity,
          documentType: kycDocType,
          idNumber: kycIdNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "KYC request failed");
        return;
      }
      applyUser(data.user);
      saveSession(data.user);
      setKycIdNumber("");
      flash("KYC submitted — pending review.");
      void loadProfile(user.id);
    } catch {
      setError("KYC request failed.");
    } finally {
      setSaving(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* ignore */
    }
  }

  function logout() {
    clearSession();
    router.push("/");
  }

  const checklist = useMemo(() => getCompletenessItems(user), [user]);
  const countryLocked = isFieldLocked(user, "country");
  const phoneLocked = isFieldLocked(user, "phone");
  const payoutLocked = isFieldLocked(user, "payout");
  const emailLocked = isFieldLocked(user, "email");
  const kycLocked = isFieldLocked(user, "kyc");

  const offersTotalPages = Math.max(1, Math.ceil(offers.length / HISTORY_PAGE_SIZE));
  const cashoutsTotalPages = Math.max(
    1,
    Math.ceil(cashouts.length / HISTORY_PAGE_SIZE),
  );
  const pagedOffers = useMemo(() => {
    const page = Math.min(offersPage, offersTotalPages);
    const start = (page - 1) * HISTORY_PAGE_SIZE;
    return offers.slice(start, start + HISTORY_PAGE_SIZE);
  }, [offers, offersPage, offersTotalPages]);
  const pagedCashouts = useMemo(() => {
    const page = Math.min(cashoutsPage, cashoutsTotalPages);
    const start = (page - 1) * HISTORY_PAGE_SIZE;
    return cashouts.slice(start, start + HISTORY_PAGE_SIZE);
  }, [cashouts, cashoutsPage, cashoutsTotalPages]);
  const safeOffersPage = Math.min(offersPage, offersTotalPages);
  const safeCashoutsPage = Math.min(cashoutsPage, cashoutsTotalPages);

  if (!user || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/5" />
        <div className="h-52 animate-pulse rounded-3xl bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const verified = user.emailVerified === true;
  const score = summary?.profileScore ?? checklist.filter((c) => c.done).length;
  const scoreMax = summary?.profileScoreMax ?? checklist.length;
  const progress = Math.round(summary?.cashoutProgress ?? 0);
  const refCode = user.referralCode || `EF${user.id.slice(-6).toUpperCase()}`;
  const xpBar = xpProgress(user.xp ?? 0);
  const securityScore = [
    verified,
    Boolean(user.twoFactorEnabled),
    Boolean(user.phone),
    user.kycStatus === "pending" || user.kycStatus === "verified",
    Boolean(user.paypalEmail || user.cryptoAddress),
  ].filter(Boolean).length;
  const securityMax = 5;
  const securityPct = Math.round((securityScore / securityMax) * 100);
  const scorePct = Math.round((score / Math.max(1, scoreMax)) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-300/80">
            Account control center
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Profile
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Verification, payouts, privacy, security — everything for safer cash outs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              verified
                ? "bg-emerald-500/15 text-emerald-300"
                : "animate-pulse-soft bg-amber-500/15 text-amber-300"
            }`}
          >
            {verified ? "Email verified" : "Email not verified"}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              user.profilePrivate
                ? "bg-violet-500/15 text-violet-200"
                : "bg-white/5 text-slate-300"
            }`}
          >
            {user.profilePrivate ? "Private" : "Public activity"}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            {user.country || "Country…"}
            {user.countryAuto ? " · Auto" : ""}
          </span>
        </div>
      </div>

      {(message || error || geoNote) && (
        <div className="animate-fade-in space-y-2">
          {(message || error) && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error || message}
            </div>
          )}
          {geoNote && !error && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              {geoNote}
            </div>
          )}
        </div>
      )}

      <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-cyan-950/40 p-5 sm:p-7">
        <div
          className="animate-float pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cyan-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-float-delayed pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="animate-scale-in relative">
              <div className="relative flex h-16 w-16 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-lg shadow-cyan-500/30">
                <div className="flex flex-1 items-center justify-center text-2xl font-bold text-ink-950">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="bg-ink-950/90 py-0.5 text-center text-[10px] font-bold tracking-wide text-cyan-300">
                  Lv {xpBar.level}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-white sm:text-2xl">{user.name}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                ID {user.id.slice(-8).toUpperCase()} · {user.accountStatus ?? "active"} ·{" "}
                {user.streak}d streak
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[440px]">
            {[
              {
                label: "Balance",
                value: formatCoins(user.balance),
                className: "text-cyan-300",
              },
              {
                label: "USD",
                value: formatUsd(coinsToUsd(user.balance)),
                className: "text-white",
              },
              {
                label: "Profile score",
                value: `${score}/${scoreMax}`,
                className: "text-emerald-300",
              },
              {
                label: "Referral",
                value: copied === "ref" ? "Copied" : refCode,
                className: "text-cyan-300",
                button: true,
              },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className="animate-fade-up rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 backdrop-blur-sm transition hover:border-cyan-400/30"
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <p className="text-[10px] text-slate-500">{cell.label}</p>
                {cell.button ? (
                  <button
                    type="button"
                    onClick={() => copyText("ref", refCode)}
                    className={`text-sm font-semibold ${cell.className}`}
                  >
                    {cell.value}
                  </button>
                ) : (
                  <p className={`text-sm font-semibold ${cell.className}`}>
                    {cell.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>XP → Level {xpBar.level + 1}</span>
              <span>
                {xpBar.intoLevel}/{xpBar.need}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="animate-shimmer h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-cyan-400 transition-all duration-700"
                style={{ width: `${xpBar.pct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>Cash out (min ${summary?.minCashoutUsd ?? 5})</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="animate-shimmer h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-400 to-amber-300 transition-all duration-700"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up touch-scroll flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/60 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              tab === item.id
                ? "bg-cyan-400 text-ink-950 shadow-lg shadow-cyan-500/25"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div key="overview" className="animate-slide-in space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Lifetime earned",
                value: formatCoins(summary?.totalEarnedCoins ?? 0),
                hint: formatUsd(summary?.totalEarnedUsd ?? 0),
                glow: "from-cyan-500/15 to-transparent",
                accent: "text-cyan-300",
              },
              {
                label: "Offers / earns",
                value: String(summary?.offerCount ?? 0),
                hint: "Ledger rows",
                glow: "from-sky-500/10 to-transparent",
                accent: "text-white",
              },
              {
                label: "XP / Streak",
                value: `${formatCoins(user.xp)} · ${user.streak}d`,
                hint: `${xpBar.remaining} XP to next level`,
                glow: "from-emerald-500/15 to-transparent",
                accent: "text-emerald-300",
              },
              {
                label: "Security health",
                value: `${securityScore}/${securityMax}`,
                hint: `${securityPct}% fortified`,
                glow: "from-amber-500/15 to-transparent",
                accent: "text-amber-200",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="animate-fade-up relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-4 transition hover:border-cyan-400/25"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.glow}`}
                  aria-hidden
                />
                <p className="relative text-xs font-medium text-slate-400">
                  {stat.label}
                </p>
                <p className={`relative mt-1.5 text-lg font-bold ${stat.accent}`}>
                  {stat.value}
                </p>
                <p className="relative mt-0.5 text-[11px] text-slate-500">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="animate-fade-up rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 transition hover:border-amber-400/40">
              <p className="text-xs text-amber-200/80">Cash out pending</p>
              <p className="mt-1 text-xl font-bold text-amber-200">
                {formatUsd(summary?.pendingUsd ?? 0)}
              </p>
            </div>
            <div
              className="animate-fade-up rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 transition hover:border-emerald-400/40"
              style={{ animationDelay: "60ms" }}
            >
              <p className="text-xs text-emerald-200/80">Cash out approved</p>
              <p className="mt-1 text-xl font-bold text-emerald-200">
                {formatUsd(summary?.approvedUsd ?? 0)}
              </p>
            </div>
            <div
              className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-4 transition hover:border-cyan-400/25"
              style={{ animationDelay: "120ms" }}
            >
              <p className="text-xs text-slate-400">Payout readiness</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {verified && (user.paypalEmail || user.cryptoAddress)
                  ? "Ready to request"
                  : "Finish email + payout method"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Preferred: {user.preferredCashout || "PayPal"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Account checklist</h2>
                <span className="text-[11px] text-slate-500">
                  {score}/{scoreMax} complete
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="animate-shimmer h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-cyan-400 transition-all duration-700"
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {checklist.map((item, i) => (
                  <li
                    key={item.key}
                    className="animate-fade-up flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-950/30 px-3 py-2 text-slate-300 transition hover:border-white/10"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.done
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                            : "bg-amber-400"
                        }`}
                      />
                      {item.label}
                    </span>
                    <span
                      className={
                        item.done ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {item.done ? "Done · Locked" : "Todo"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                Completed steps stay locked until an admin unlocks them for redo.
              </p>
            </div>

            <div className="space-y-4">
              <div className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-5">
                <h2 className="text-sm font-semibold text-white">Security posture</h2>
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-all duration-700"
                    style={{
                      background: `conic-gradient(#34d399 ${securityPct}%, rgba(255,255,255,0.08) 0)`,
                    }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950 text-sm font-bold text-white">
                      {securityPct}%
                    </div>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li className={verified ? "text-emerald-300" : ""}>
                      Email {verified ? "✓" : "—"}
                    </li>
                    <li className={user.twoFactorEnabled ? "text-emerald-300" : ""}>
                      2FA {user.twoFactorEnabled ? "✓" : "optional"}
                    </li>
                    <li className={user.phone ? "text-emerald-300" : ""}>
                      Phone {user.phone ? "✓" : "—"}
                    </li>
                    <li
                      className={
                        user.kycStatus === "pending" ||
                        user.kycStatus === "verified"
                          ? "text-emerald-300"
                          : ""
                      }
                    >
                      KYC {user.kycStatus || "none"}
                    </li>
                  </ul>
                </div>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="secondary"
                  onClick={() => setTab("security")}
                >
                  Open security
                </Button>
              </div>

              <div
                className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-5"
                style={{ animationDelay: "80ms" }}
              >
                <h2 className="text-sm font-semibold text-white">Quick info</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex justify-between gap-3">
                    <span>Country</span>
                    <span>{user.country || "—"}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Timezone</span>
                    <span className="truncate text-right">
                      {user.timezone || "—"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Privacy</span>
                    <span>{user.profilePrivate ? "Private" : "Public"}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Member since</span>
                    <span>{formatDate(user.memberSince)}</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || countryLocked}
                    onClick={detectCountryNow}
                  >
                    {countryLocked ? "Country locked" : "Re-detect country"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" href="/dashboard/cashout">
              Cash Out
            </Button>
            <Button variant="secondary" href="/dashboard/redeem">
              Redeem
            </Button>
            <Button variant="outline" href="/dashboard/refer">
              Refer {refCode}
            </Button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div key="history" className="animate-slide-in space-y-4">
          <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">Completed offers</h2>
              {offers.length > 0 ? (
                <span className="text-[11px] text-slate-500">
                  {offers.length} total · page {safeOffersPage}/{offersTotalPages}
                </span>
              ) : null}
            </div>
            {!offers.length ? (
              <p className="mt-4 text-sm text-slate-500">No offers yet.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {pagedOffers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {offer.source}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(offer.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-cyan-300">
                        +{formatCoins(offer.coins)}
                      </p>
                    </li>
                  ))}
                </ul>
                {offersTotalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={safeOffersPage <= 1}
                      onClick={() =>
                        setOffersPage((p) => Math.max(1, p - 1))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from({ length: offersTotalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setOffersPage(n)}
                            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                              n === safeOffersPage
                                ? "bg-cyan-400 text-ink-950"
                                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {n}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={safeOffersPage >= offersTotalPages}
                      onClick={() =>
                        setOffersPage((p) =>
                          Math.min(offersTotalPages, p + 1),
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">Cash out history</h2>
              {cashouts.length > 0 ? (
                <span className="text-[11px] text-slate-500">
                  {cashouts.length} total · page {safeCashoutsPage}/
                  {cashoutsTotalPages}
                </span>
              ) : null}
            </div>
            {!cashouts.length ? (
              <p className="mt-4 text-sm text-slate-500">No cash outs yet.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {pagedCashouts.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {row.method} · {formatUsd(row.amountUsd)}
                        </p>
                        {row.giftCode && (
                          <p className="mt-0.5 font-mono text-[11px] text-emerald-300">
                            Code: {row.giftCode}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          {formatDate(row.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyle(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
                {cashoutsTotalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={safeCashoutsPage <= 1}
                      onClick={() =>
                        setCashoutsPage((p) => Math.max(1, p - 1))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from(
                        { length: cashoutsTotalPages },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCashoutsPage(n)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                            n === safeCashoutsPage
                              ? "bg-cyan-400 text-ink-950"
                              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={safeCashoutsPage >= cashoutsTotalPages}
                      onClick={() =>
                        setCashoutsPage((p) =>
                          Math.min(cashoutsTotalPages, p + 1),
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}

      {tab === "settings" && (
        <form
          key="settings"
          onSubmit={saveSettings}
          className="animate-slide-in space-y-4 rounded-2xl border border-white/10 bg-ink-900/60 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Account settings</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || countryLocked}
              onClick={detectCountryNow}
            >
              {countryLocked ? "Country locked" : "Detect country"}
            </Button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">
              Country {countryLocked ? "(locked)" : countryAuto ? "(auto)" : "(manual)"}
            </span>
            <select
              value={country}
              disabled={countryLocked}
              onChange={(e) => {
                const nextCountry = e.target.value;
                const prevDial = dialCodeForCountry(country);
                const nextDial = dialCodeForCountry(nextCountry);
                setCountry(nextCountry);
                setCountryAuto(false);
                if (phoneLocked) return;
                if (
                  nextDial &&
                  nextDial !== "+" &&
                  isPhoneJustDialCode(phone, prevDial)
                ) {
                  setPhone(nextDial);
                }
              }}
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select country</option>
              {COUNTRY_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-3 text-sm text-slate-300">
            <span>Keep country auto-updated from IP</span>
            <input
              type="checkbox"
              checked={countryAuto}
              disabled={countryLocked}
              onChange={(e) => setCountryAuto(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-ink-950 text-cyan-400 disabled:opacity-50"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">Timezone</span>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
              >
                <option value="en">English</option>
                <option value="bn">Bangla</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">
              Phone {phoneLocked ? "(locked)" : ""}
              {!phoneLocked && dialCodeForCountry(country) ? (
                <span className="ml-1 text-slate-500">
                  · code {dialCodeForCountry(country)} from country
                </span>
              ) : null}
            </span>
            <div className="flex gap-2">
              <span
                className="flex h-11 shrink-0 items-center rounded-xl border border-white/10 bg-ink-950/80 px-3 text-sm font-medium text-cyan-300"
                title="Auto from selected country"
              >
                {dialCodeForCountry(country) || "+??"}
              </span>
              <input
                value={phone}
                disabled={phoneLocked}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => {
                  if (phoneLocked) return;
                  const dial = dialCodeForCountry(country);
                  if (dial && dial !== "+" && !phone.trim()) {
                    setPhone(dial);
                  }
                }}
                placeholder={phonePlaceholderForCountry(country)}
                inputMode="tel"
                autoComplete="tel"
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-3 text-sm text-slate-300">
            <span>
              <span className="block font-medium text-white">Private account</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Still appears in live feed. Tap shows profile, but hides what you completed.
                {profilePrivate ? " · On" : " · Off"}
              </span>
            </span>
            <input
              type="checkbox"
              checked={profilePrivate}
              disabled={saving}
              onChange={(e) => void toggleProfilePrivate(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-white/20 bg-ink-950 text-cyan-400 disabled:opacity-50"
            />
          </label>

          <div className="space-y-2 rounded-xl border border-white/8 bg-ink-950/40 p-3">
            <p className="text-xs font-medium text-slate-400">Notifications</p>
            {[
              {
                label: "New offers & bonuses",
                checked: notifyOffers,
                set: setNotifyOffers,
              },
              {
                label: "Cash out updates",
                checked: notifyCashout,
                set: setNotifyCashout,
              },
              {
                label: "Newsletter & promos",
                checked: notifyNewsletter,
                set: setNotifyNewsletter,
              },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between gap-3 text-sm text-slate-300"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.set(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-ink-950 text-cyan-400"
                />
              </label>
            ))}
          </div>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </form>
      )}

      {tab === "security" && (
        <div key="security" className="animate-slide-in space-y-4">
          <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Email verification</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Required for safer withdrawals on GPT sites.
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  verified
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {verified ? "Verified" : "Unverified"}
              </span>
            </div>

            {!verified && (
              <div className="mt-4 space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={verifyBusy}
                  onClick={() => void instantVerify()}
                >
                  {verifyBusy ? "Verifying…" : "Verify email now"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Email SMTP is not connected yet — tap above to verify this
                  account instantly. Or use a code:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={verifyBusy}
                    onClick={() => void sendVerifyCode()}
                  >
                    {verifyBusy ? "Please wait…" : "Send verification code"}
                  </Button>
                </div>
                {sentCode && (
                  <p className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-50">
                    Your code:{" "}
                    <span className="font-mono text-lg font-bold tracking-[0.2em] text-white">
                      {sentCode}
                    </span>
                  </p>
                )}
                <form
                  onSubmit={(e) => void confirmVerify(e)}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={verifyCode}
                    onChange={(e) =>
                      setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 font-mono text-sm tracking-widest text-white outline-none focus:border-cyan-400/50"
                  />
                  <Button type="submit" variant="secondary" disabled={verifyBusy}>
                    Confirm code
                  </Button>
                </form>
                {verifyNote && (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {verifyNote}
                  </p>
                )}
                {verifyErr && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {verifyErr}
                  </p>
                )}
              </div>
            )}
            {verified && emailLocked && (
              <p className="mt-4 text-sm text-slate-400">
                Email verified and locked. Admin must unlock if you need to redo
                verification.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Two-factor auth</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Extra login protection for your rewards account.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-ink-950 text-cyan-400"
                />
                Enable 2FA
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void saveSettings(e as unknown as FormEvent);
              }}
            >
              Save 2FA preference
            </Button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">KYC / Identity</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Fill every field below to start verification. ID number is
                  required at the end.
                </p>
              </div>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-300">
                {user.kycStatus || "none"}
              </span>
            </div>

            {kycLocked && (
              <div className="mt-4 space-y-2 rounded-xl border border-white/8 bg-ink-950/50 p-4 text-sm text-slate-300">
                <p>
                  Status:{" "}
                  <span className="font-semibold capitalize text-white">
                    {user.kycStatus}
                  </span>
                  <span className="ml-2 text-emerald-300">· Locked</span>
                </p>
                {user.kycFullName && (
                  <p>
                    Name: <span className="text-white">{user.kycFullName}</span>
                  </p>
                )}
                {user.kycDocType && (
                  <p>
                    Document:{" "}
                    <span className="text-white">
                      {user.kycDocType.replace(/_/g, " ")}
                    </span>
                  </p>
                )}
                {user.kycIdNumberMasked && (
                  <p>
                    ID number:{" "}
                    <span className="font-mono text-white">
                      {user.kycIdNumberMasked}
                    </span>
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  You cannot resubmit KYC until an admin unlocks it.
                </p>
              </div>
            )}

            {!kycLocked && (
              <form onSubmit={startKyc} className="mt-4 space-y-3">
                {user.kycStatus === "rejected" && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    Previous KYC was rejected. Submit again with correct details.
                  </p>
                )}
                {Boolean(user.adminUnlocks?.kyc) && (
                  <p className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                    Admin unlocked KYC — you can submit again.
                  </p>
                )}
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    Full legal name *
                  </span>
                  <input
                    required
                    value={kycFullName}
                    onChange={(e) => setKycFullName(e.target.value)}
                    placeholder="As shown on your ID"
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    Date of birth *
                  </span>
                  <input
                    required
                    type="date"
                    value={kycDob}
                    onChange={(e) => setKycDob(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    Country *
                  </span>
                  <select
                    required
                    value={kycCountry}
                    onChange={(e) => setKycCountry(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="">Select country</option>
                    {COUNTRY_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    Address *
                  </span>
                  <input
                    required
                    value={kycAddress}
                    onChange={(e) => setKycAddress(e.target.value)}
                    placeholder="Street address"
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    City *
                  </span>
                  <input
                    required
                    value={kycCity}
                    onChange={(e) => setKycCity(e.target.value)}
                    placeholder="City"
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    ID document type *
                  </span>
                  <select
                    required
                    value={kycDocType}
                    onChange={(e) => setKycDocType(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver&apos;s license</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">
                    ID number *
                  </span>
                  <input
                    required
                    value={kycIdNumber}
                    onChange={(e) =>
                      setKycIdNumber(e.target.value.toUpperCase())
                    }
                    placeholder="Enter your ID / passport number"
                    className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 font-mono text-sm tracking-wide text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  All fields are required. Submit only if the details match your
                  government ID.
                </p>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Submitting…" : "Start KYC verification"}
                </Button>
              </form>
            )}
          </section>

          <form
            onSubmit={changePassword}
            className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-5"
          >
            <h2 className="text-lg font-bold text-white">Change password</h2>
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">
                Current password
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <Button type="submit" variant="primary" disabled={saving}>
              Update password
            </Button>
          </form>
        </div>
      )}

      {tab === "payouts" && (
        <form
          key="payouts"
          onSubmit={saveSettings}
          className="animate-slide-in space-y-4 rounded-2xl border border-white/10 bg-ink-900/60 p-5"
        >
          <h2 className="text-lg font-bold text-white">Payout methods</h2>
          <p className="text-sm text-slate-400">
            {payoutLocked
              ? "Payout details are locked after saving. Admin must unlock to change."
              : "Save preferred cash out details for faster withdrawals."}
          </p>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">
              Preferred method
            </span>
            <select
              value={preferredCashout}
              disabled={payoutLocked}
              onChange={(e) => setPreferredCashout(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {["PayPal", "Visa", "Bitcoin", "Ethereum", "Litecoin", "Amazon", "Bank Transfer"].map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">
              PayPal email {payoutLocked ? "(locked)" : ""}
            </span>
            <input
              type="email"
              value={paypalEmail}
              disabled={payoutLocked}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="paypal@email.com"
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">
              Crypto wallet address {payoutLocked ? "(locked)" : ""}
            </span>
            <input
              value={cryptoAddress}
              disabled={payoutLocked}
              onChange={(e) => setCryptoAddress(e.target.value)}
              placeholder="BTC / LTC / USDT address"
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <Button type="submit" variant="primary" disabled={saving || payoutLocked}>
            {payoutLocked
              ? "Payout methods locked"
              : saving
                ? "Saving…"
                : "Save payout methods"}
          </Button>
          <Button
            variant="outline"
            href="/dashboard/cashout"
            className="w-full sm:w-auto"
          >
            Go to Cash Out
          </Button>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-medium text-red-200 hover:bg-red-500/15"
        >
          Log out
        </button>
        <Link
          href="/"
          className="mt-2 block text-center text-sm text-slate-500 hover:text-slate-300"
        >
          Back to landing
        </Link>
      </div>
    </div>
  );
}
