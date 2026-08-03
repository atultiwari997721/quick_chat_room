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
  onLeft: () => void;
  onRemoved: (message?: string) => void;
  onProfileUpdate: (user: Account) => void;
};

export function ChatRoom({
  account,
  token,
  room,
  onLeft,
  onRemoved,
  onProfileUpdate,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomUser[]>(room.members);
  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [leftRoom, setLeftRoom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = account.id === room.adminId;
  const isDm = room.kind === "dm";
  const shareUrlText = `${window.location.origin}/?room=${room.code}`;

  const securityToast = useChatSecurity(true, () => setBlocked(true));

  useEffect(() => {
    if (!blocked && !securityToast) return;
    const t = setTimeout(() => {
      setBlocked(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [blocked, securityToast]);

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
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-sm font-bold text-white shadow">
          {room.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{room.name}</h1>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              onClick={copyLink}
              className="font-mono font-medium hover:text-zinc-900 dark:hover:text-zinc-50"
              title="Copy invite link"
            >
              #{room.code}
            </button>
            <span>· {members.length} member{members.length === 1 ? "" : "s"}</span>
            {isAdmin && !isDm && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Admin
              </span>
            )}
            {isDm && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Private
              </span>
            )}
          </div>
        </div>
        {!isDm && (
          <button
            onClick={copyLink}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {copied ? "Copied" : "Invite"}
          </button>
        )}
        <button
          onClick={clearChat}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Clear Chat
        </button>
        <button
          onClick={() => setShowProfile(true)}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Profile
        </button>
        {!isDm && (
          <button
            onClick={() => setShowMembers((v) => !v)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
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
          className="rounded-full px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          Leave
        </button>
      </header>

      {info && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {info}
        </div>
      )}

      {blocked && (
        <div className="absolute left-1/2 top-14 z-50 -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white/90 dark:text-zinc-900">
          📸 Screenshots, copying and saving are disabled in this chat
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
              className="relative z-10 flex-1 space-y-3 select-none overflow-y-auto px-4 py-4"
              style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
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