"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getSession } from "@/lib/session";

type Msg = {
  id: string;
  role: "user" | "bot" | "admin" | "system";
  text: string;
  createdAt: string;
};

type Chat = {
  id: string;
  status: string;
  botEnabled: boolean;
  unreadUser: number;
  messages: Msg[];
};

type Pos = { x: number; y: number };

const POS_KEY = "earnflow_chat_btn_pos";
const BTN = 56;
const PAD = 12;

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 20, y: 20 };
  return {
    x: Math.max(PAD, window.innerWidth - BTN - 20),
    y: Math.max(PAD, window.innerHeight - BTN - 20),
  };
}

function clampPos(p: Pos): Pos {
  const maxX = Math.max(PAD, window.innerWidth - BTN - PAD);
  const maxY = Math.max(PAD, window.innerHeight - BTN - PAD);
  return {
    x: Math.min(maxX, Math.max(PAD, p.x)),
    y: Math.min(maxY, Math.max(PAD, p.y)),
  };
}

function loadPos(): Pos {
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return defaultPos();
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
      return defaultPos();
    }
    return clampPos(parsed);
  } catch {
    return defaultPos();
  }
}

export function LiveSupportChat() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pos, setPos] = useState<Pos>({ x: 20, y: 20 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    ox: number;
    oy: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setPos(loadPos());
    setReady(true);
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const sync = () => setUserId(getSession()?.id ?? null);
    sync();
    window.addEventListener("earnflow-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("earnflow-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/support/chat?userId=${userId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.chat) setChat(data.chat);
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !open) return;
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [userId, open, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length, open]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d?.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      setPos(clampPos({ x: e.clientX - d.ox, y: e.clientY - d.oy }));
    }

    function onUp() {
      const d = dragRef.current;
      if (!d?.active) return;
      d.active = false;
      setDragging(false);
      setPos((p) => {
        const next = clampPos(p);
        try {
          window.localStorage.setItem(POS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  async function send(escalate = false) {
    if (!userId || busy) return;
    const msg = escalate
      ? text.trim() || "I need to talk to an admin."
      : text.trim();
    if (!msg) return;
    setBusy(true);
    setText("");
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text: msg, escalate }),
      });
      const data = await res.json();
      if (res.ok && data.chat) setChat(data.chat);
    } finally {
      setBusy(false);
    }
  }

  function panelStyle(): CSSProperties {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(380, Math.max(280, vw - 24));
    const panelH = Math.min(520, Math.max(320, vh * (vw < 640 ? 0.62 : 0.7)));
    let left = pos.x + BTN / 2 - panelW / 2;
    left = Math.min(vw - panelW - PAD, Math.max(PAD, left));

    const spaceAbove = pos.y - PAD;
    const spaceBelow = vh - (pos.y + BTN) - PAD;
    let top: number;
    if (spaceAbove >= panelH + 8 || spaceAbove >= spaceBelow) {
      top = pos.y - panelH - 12;
    } else {
      top = pos.y + BTN + 12;
    }
    top = Math.min(vh - panelH - PAD, Math.max(PAD, top));

    return {
      left,
      top,
      width: panelW,
      height: panelH,
      maxWidth: "calc(100vw - 1.5rem)",
      maxHeight: "calc(100dvh - 1.5rem)",
    };
  }

  if (!userId || !ready) return null;

  const waiting =
    chat?.status === "waiting_admin" || chat?.status === "admin_active";

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          dragRef.current = {
            active: true,
            moved: false,
            ox: e.clientX - rect.left,
            oy: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY,
          };
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onClick={() => {
          if (dragRef.current?.moved) {
            dragRef.current.moved = false;
            return;
          }
          setOpen((v) => !v);
        }}
        style={{ left: pos.x, top: pos.y }}
        className={`fixed z-[60] flex h-14 w-14 touch-none items-center justify-center rounded-2xl bg-cyan-400 text-ink-950 shadow-lg shadow-cyan-500/20 select-none ${
          dragging
            ? "cursor-grabbing scale-105"
            : "cursor-grab transition hover:scale-105 hover:bg-cyan-300"
        }`}
        aria-label="Live support chat — drag to move"
        title="Drag to move anywhere"
      >
        {open ? (
          <span className="text-xl font-bold">✕</span>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {waiting && !open && (
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-400 ring-2 ring-ink-950" />
        )}
      </button>

      {open && (
        <div
          style={panelStyle()}
          className="fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-ink-950 shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-900/90 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Live Support</p>
              <p className="text-[11px] text-slate-400">
                {chat?.status === "admin_active"
                  ? "Admin connected"
                  : chat?.status === "waiting_admin"
                    ? "Waiting for admin…"
                    : "Drag the button to move · bot + admin"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void send(true)}
              className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              Talk to admin
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {(chat?.messages || []).map((m) => {
              const mine = m.role === "user";
              const system = m.role === "system";
              if (system) {
                return (
                  <p
                    key={m.id}
                    className="text-center text-[11px] text-slate-500"
                  >
                    {m.text}
                  </p>
                );
              }
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      mine
                        ? "bg-cyan-400 text-ink-950"
                        : m.role === "admin"
                          ? "border border-amber-400/30 bg-amber-500/10 text-amber-50"
                          : "border border-white/10 bg-ink-900 text-slate-200"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                        {m.role === "admin" ? "Admin" : "Bot"}
                      </p>
                    )}
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 bg-ink-900/80 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(false);
              }}
              className="flex gap-2"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask anything…"
                maxLength={2000}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="h-10 rounded-xl bg-cyan-400 px-3 text-sm font-semibold text-ink-950 disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
