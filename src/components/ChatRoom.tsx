"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MembersPanel } from "@/components/MembersPanel";
import { ProfilePanel } from "@/components/ProfilePanel";
import type { ChatMessage, Room, RoomUser } from "@/lib/types";

type ChatRoomProps = {
  room: Room;
  user: RoomUser;
  onLeft: () => void;
  onRemoved: (message?: string) => void;
  onProfileUpdate: (user: RoomUser) => void;
};

export function ChatRoom({
  room,
  user,
  onLeft,
  onRemoved,
  onProfileUpdate,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([user]);
  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.id === room.adminId;
  const shareUrlText = `${window.location.origin}/?room=${room.code}`;

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(dist < 100);
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, atBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?roomId=${room.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ChatMessage[];
        setMessages(data);
      }
    } catch {
      // ignore
    }
  }, [room.id]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${room.code}`, { cache: "no-store" });
      if (res.status === 404) {
        onRemoved("This room was closed by its admin.");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { users: RoomUser[] };
        setUsers(data.users);
        if (!data.users.some((u) => u.id === user.id)) {
          onRemoved();
        }
      }
    } catch {
      // ignore
    }
  }, [room.code, user.id, onRemoved]);

  useEffect(() => {
    const m = setInterval(loadMessages, 2000);
    const u = setInterval(loadUsers, 3000);
    return () => {
      clearInterval(m);
      clearInterval(u);
    };
  }, [loadMessages, loadUsers]);

  useEffect(() => {
    const sendLeave = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/users/${user.id}/leave`);
      }
    };
    window.addEventListener("pagehide", sendLeave);
    return () => window.removeEventListener("pagehide", sendLeave);
  }, [user.id]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    setAtBottom(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, roomId: room.id, userId: user.id }),
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

  const removeUser = async (userId: string) => {
    const res = await fetch(`/api/rooms/${room.code}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId: user.id, userId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { users: RoomUser[] };
      setUsers(data.users);
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) setInfo(data.error);
    }
  };

  const saveProfile = async (name: string, avatar: string | null) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar }),
    });
    if (res.ok) {
      const updated = (await res.json()) as RoomUser;
      onProfileUpdate(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessages((prev) =>
        prev.map((m) =>
          m.user.id === updated.id ? { ...m, user: updated } : m
        )
      );
      setShowProfile(false);
    }
  };

  return (
    <main className="relative flex min-h-0 w-full flex-1 flex-col self-center overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Avatar name={user.name} avatar={user.avatar} />
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
            {isAdmin && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Admin
              </span>
            )}
          </div>
        </div>
        <button
          onClick={copyLink}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        <button
          onClick={() => setShowProfile(true)}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Profile
        </button>
        <button
          onClick={() => setShowMembers((v) => !v)}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Members ({users.length})
        </button>
        <button
          onClick={onLeft}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          Leave
        </button>
      </header>

      {info && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {info}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {showMembers && (
          <MembersPanel
            users={users}
            currentUserId={user.id}
            adminId={room.adminId}
            onRemove={removeUser}
            onClose={() => setShowMembers(false)}
          />
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl font-semibold text-zinc-400 dark:bg-zinc-800">
                  #
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  No messages yet.
                </p>
                <p className="text-sm text-zinc-400">
                  Share the invite link to bring people in.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.user.id === user.id;
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar name={m.user.name} avatar={m.user.avatar} size="sm" />
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-sm bg-indigo-600 text-white dark:bg-indigo-500"
                        : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    <div
                      className={`mb-1 text-xs font-medium opacity-80 ${
                        mine ? "text-right text-indigo-100" : ""
                      }`}
                    >
                      {m.user.name}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                    <div
                      className={`mt-1 text-[10px] opacity-60 ${
                        mine ? "text-right text-indigo-100" : ""
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
              placeholder="Type a message"
              maxLength={500}
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-400 dark:focus:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-indigo-600 px-5 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
          user={user}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </main>
  );
}
