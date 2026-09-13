"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MembersPanel } from "@/components/MembersPanel";
import { ProfilePanel } from "@/components/ProfilePanel";
import { useChatSecurity, Watermark } from "@/components/useChatSecurity";
import type { Account, ChatMessage, Room, RoomUser } from "@/lib/types";

type ChatRoomProps = {
  account: Account;
  token: string;
  room: Room;
  onBack?: () => void;
  onLeft: () => void;
  onRemoved: (message?: string) => void;
  onProfileUpdate: (user: Account) => void;
};

export function ChatRoom({
  account,
  token,
  room,
  onBack,
  onLeft,
  onRemoved,
  onProfileUpdate,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomUser[]>(room.members);
  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [securityToast, setSecurityToast] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [leftRoom, setLeftRoom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = account.id === room.adminId;
  const isDm = room.kind === "dm";
  const shareUrlText = `${window.location.origin}/?room=${room.code}`;

  const postSystemNotice = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: text, roomId: room.id }),
        });
        if (res.ok) {
          const message = (await res.json()) as ChatMessage;
          setMessages((prev) => [...prev, message]);
        }
      } catch {
        // ignore
      }
    },
    [token, room.id]
  );

  const handleCopyDetected = useCallback(() => {
    setSecurityToast("📋 Copied to clipboard! Notification sent to chat.");
    void postSystemNotice(`📋 ${account.name} copied text from the chat`);
  }, [account.name, postSystemNotice]);

  const handleScreenshotDetected = useCallback(() => {
    setSecurityToast("📸 Screenshot detected! Notification sent to chat.");
    void postSystemNotice(`📸 ${account.name} took a screenshot!`);
  }, [account.name, postSystemNotice]);

  useChatSecurity({
    active: true,
    onCopy: handleCopyDetected,
    onScreenshot: handleScreenshotDetected,
  });

  useEffect(() => {
    if (!securityToast) return;
    const t = setTimeout(() => {
      setSecurityToast(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [securityToast]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(dist < 80);
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, atBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?roomId=${room.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ChatMessage[];
        setMessages(data);
      }
    } catch {
      // ignore
    }
  }, [room.id, token]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${room.code}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 404) {
        onRemoved("This room was closed by its admin.");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { room: Room };
        setMembers(data.room.members);
        if (!data.room.members.some((u) => u.id === account.id)) {
          onRemoved();
        }
      }
    } catch {
      // ignore
    }
  }, [room.code, account.id, token, onRemoved]);

  useEffect(() => {
    const m = setInterval(loadMessages, 2000);
    const u = setInterval(loadMembers, 4000);
    return () => {
      clearInterval(m);
      clearInterval(u);
    };
  }, [loadMessages, loadMembers]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    setAtBottom(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, roomId: room.id }),
      });
      if (res.ok) {
        const message = (await res.json()) as ChatMessage;
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error) setInfo(data.error);
      }
    } catch {
      // ignore
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const clearChat = async () => {
    const confirmed = window.confirm(
      "Clear this chat for everyone? All messages will be permanently deleted for both sides. This cannot be undone."
    );
    if (!confirmed) return;
    const res = await fetch(`/api/rooms/${room.code}/clear`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMessages([]);
      setInfo("Chat cleared for everyone.");
      setTimeout(() => setInfo(null), 2000);
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) setInfo(data.error);
    }
  };

  const leave = useCallback(() => {
    if (leftRoom) return;
    setLeftRoom(true);
    void fetch(`/api/users/${account.id}/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomId: room.id }),
    }).finally(() => onLeft());
  }, [account.id, token, room.id, onLeft, leftRoom]);

  const removeUser = async (userId: string) => {
    const res = await fetch(`/api/rooms/${room.code}/remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { users: RoomUser[] };
      setMembers(data.users);
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) setInfo(data.error);
    }
  };

  const saveProfile = async (name: string, avatar: string | null) => {
    const res = await fetch(`/api/users/${account.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, avatar }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Account;
      onProfileUpdate(updated);
      setMembers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.user.id === updated.id ? { ...m, user: updated } : m
        )
      );
      setShowProfile(false);
    }
  };

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="relative flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-4 sm:py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
            title="Back to chats"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-sm font-bold text-white shadow-sm">
          {room.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">{room.name}</h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <button
              onClick={copyLink}
              className="font-mono font-medium hover:text-zinc-900 dark:hover:text-zinc-50"
              title="Copy invite link"
            >
              #{room.code}
            </button>
            <span>· {members.length} member{members.length === 1 ? "" : "s"}</span>
            {isAdmin && !isDm && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Admin
              </span>
            )}
            {isDm && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Private
              </span>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex md:items-center md:gap-1.5">
          {!isDm && (
            <button
              onClick={copyLink}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {copied ? "Copied" : "Invite"}
            </button>
          )}
          <button
            onClick={clearChat}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Clear Chat
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Profile
          </button>
          {!isDm && (
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Members ({members.length})
            </button>
          )}
          <button
            onClick={() => {
              if (
                isAdmin &&
                !window.confirm(
                  "Leaving will delete this room and all messages for everyone. Continue?"
                )
              ) {
                return;
              }
              leave();
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Leave
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 md:hidden">
          {!isDm && (
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              title="Members"
            >
              👥 <span>{members.length}</span>
            </button>
          )}
          {!isDm && (
            <button
              onClick={copyLink}
              className="flex h-8 items-center rounded-full bg-indigo-50 px-2.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              title="Invite"
            >
              {copied ? "Copied!" : "Invite"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Room Options"
          >
            ⋮
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-3 top-12 z-50 w-48 rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowProfile(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                👤 Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  clearChat();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                🧹 Clear Chat
              </button>
              {!isDm && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copyLink();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  🔗 Copy Invite Link
                </button>
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    isAdmin &&
                    !window.confirm(
                      "Leaving will delete this room and all messages for everyone. Continue?"
                    )
                  ) {
                    return;
                  }
                  leave();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                🚪 Leave Room
              </button>
            </div>
          </>
        )}
      </header>

      {info && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {info}
        </div>
      )}

      {securityToast && (
        <div className="absolute left-1/2 top-14 z-50 -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs dark:bg-white/90 dark:text-zinc-900">
          {securityToast}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {showMembers && (
          <MembersPanel
            members={members}
            currentUserId={account.id}
            adminId={room.adminId}
            onRemove={removeUser}
            onClose={() => setShowMembers(false)}
          />
        )}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <Watermark text={account.name} />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative z-10 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-2xl font-bold text-white shadow">
                  #
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  No messages yet.
                </p>
                <p className="text-sm text-zinc-400">
                  {isDm
                    ? "This is your private chat. Say hello!"
                    : `Share the invite link (#${room.code}) to bring people in.`}
                </p>
              </div>
            )}
            {messages.map((m) => {
              const isSecurityNotice =
                m.content.startsWith("📸 ") || m.content.startsWith("📋 ");
              if (isSecurityNotice) {
                return (
                  <div key={m.id} className="my-2.5 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200/90 px-3.5 py-1 text-xs font-medium text-zinc-700 shadow-xs dark:bg-zinc-800/90 dark:text-zinc-300">
                      {m.content}
                    </span>
                  </div>
                );
              }

              const mine = m.user.id === account.id;
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar name={m.user.name} avatar={m.user.avatar} size="sm" />
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-sm bg-gradient-to-br from-indigo-600 to-pink-500 text-white"
                        : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    <div
                      className={`mb-1 text-xs font-medium opacity-80 ${
                        mine ? "text-right text-white/90" : ""
                      }`}
                    >
                      {m.user.name}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                    <div
                      className={`mt-1 text-[10px] opacity-60 ${
                        mine ? "text-right text-white/90" : ""
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${room.name}`}
              maxLength={500}
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-400 dark:focus:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-5 py-2 font-semibold text-white shadow transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-4 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-md transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Jump to latest
        </button>
      )}

      {showProfile && (
        <ProfilePanel
          user={account}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </main>
  );
}