"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { ago } from "@/lib/admin-types";

type Thread = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  botEnabled: boolean;
  unreadAdmin: number;
  lastMessageAt: string;
  preview: string;
};

type Msg = {
  id: string;
  role: string;
  text: string;
  createdAt: string;
};

type Chat = Thread & {
  messages: Msg[];
};

export default function AdminChatPage() {
  const { api, busy } = useAdmin();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const res = await api<{ chats?: Thread[]; waiting?: number }>(
      `/api/admin/support?status=${filter}`,
    );
    if (res.ok) {
      setThreads(res.data.chats || []);
      setWaiting(res.data.waiting || 0);
    }
  }, [api, filter]);

  const loadChat = useCallback(
    async (id: string) => {
      const res = await api<{ chat?: Chat }>(`/api/admin/support?id=${id}`);
      if (res.ok && res.data.chat) {
        setChat(res.data.chat);
        setActiveId(id);
      }
    },
    [api],
  );

  useEffect(() => {
    void loadList();
    const id = window.setInterval(() => void loadList(), 5000);
    return () => window.clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    if (!activeId) return;
    void loadChat(activeId);
    const id = window.setInterval(() => void loadChat(activeId), 4000);
    return () => window.clearInterval(id);
  }, [activeId, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length]);

  async function act(
    action: "reply" | "takeover" | "enable_bot" | "close",
    msg?: string,
  ) {
    if (!activeId) return;
    const res = await api<{ chat?: Chat }>("/api/admin/support", {
      method: "POST",
      json: {
        chatId: activeId,
        action,
        text: msg,
      },
    });
    if (res.ok && res.data.chat) {
      setChat(res.data.chat);
      void loadList();
    }
  }

  return (
    <AdminShell
      title="Live Chat"
      subtitle="Bot answers first — you take over when needed"
      actions={
        <Badge tone={waiting ? "warn" : "ok"}>
          {waiting} need attention
        </Badge>
      }
    >
      <div className="animate-fade-up grid gap-4 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-ink-900/60 p-3">
          <div className="mb-2 flex flex-wrap gap-1">
            {(["all", "waiting_admin", "admin_active", "open"] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                    filter === f
                      ? "bg-cyan-400 text-ink-950"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {f === "waiting_admin"
                    ? "Waiting"
                    : f === "admin_active"
                      ? "Yours"
                      : f === "open"
                        ? "Bot"
                        : "All"}
                </button>
              ),
            )}
          </div>
          <ul className="max-h-[40vh] space-y-1 overflow-y-auto md:max-h-[65vh]">
            {!threads.length && (
              <li className="px-2 py-6 text-center text-sm text-slate-500">
                No chats yet
              </li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                    activeId === t.id
                      ? "bg-cyan-500/15 ring-1 ring-cyan-400/30"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {t.userName || "User"}
                    </p>
                    {t.unreadAdmin > 0 && (
                      <span className="rounded-md bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                        {t.unreadAdmin}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-500">
                    {t.preview || t.userEmail}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    {t.status.replace("_", " ")} · {ago(t.lastMessageAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-ink-900/60 sm:min-h-[420px]">
          {!chat ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Select a chat to reply as admin
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{chat.userName}</p>
                  <p className="text-[11px] text-slate-500">
                    {chat.userEmail} · {chat.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void act("takeover")}
                  >
                    Take over
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act("enable_bot")}
                  >
                    Enable bot
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void act("close")}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {chat.messages.map((m) => {
                  if (m.role === "system") {
                    return (
                      <p
                        key={m.id}
                        className="text-center text-[11px] text-slate-500"
                      >
                        {m.text}
                      </p>
                    );
                  }
                  const mine = m.role === "admin";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          mine
                            ? "bg-cyan-400 text-ink-950"
                            : m.role === "bot"
                              ? "border border-white/10 bg-ink-950 text-slate-300"
                              : "border border-white/10 bg-ink-800 text-white"
                        }`}
                      >
                        <p className="mb-0.5 text-[10px] font-semibold uppercase opacity-50">
                          {m.role}
                        </p>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex gap-2 border-t border-white/10 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const msg = text.trim();
                  if (!msg) return;
                  setText("");
                  void act("reply", msg);
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reply as admin…"
                  className={`${adminInput} flex-1`}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={busy || !text.trim()}
                >
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
