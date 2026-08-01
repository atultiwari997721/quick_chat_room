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
  onRemoved: () => void;
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
  const endRef = useRef<HTMLDivElement>(null);

  const shareUrlText = `${window.location.origin}/?room=${room.code}`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        setInfo("This room no longer exists.");
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
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, roomId: room.id, userId: user.id }),
      });
      if (res.ok) {
        const message = (await res.json()) as ChatMessage;
        setMessages((prev) => [...prev, message]);
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
    <main className="m-4 flex w-full max-w-6xl flex-1 flex-col self-center overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Avatar name={user.name} avatar={user.avatar} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{room.name}</h1>
          <button
            onClick={copyLink}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            title="Copy invite link"
          >
            #{room.code}
          </button>
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

      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
        {showMembers && (
          <MembersPanel
            users={users}
            currentUserId={user.id}
            adminId={room.adminId}
            onRemove={removeUser}
            onClose={() => setShowMembers(false)}
          />
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-zinc-500">
                No messages yet. Say hello!
              </p>
            )}
            {messages.map((m) => {
              const mine = m.user.id === user.id;
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar name={m.user.name} avatar={m.user.avatar} size="sm" />
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    <div
                      className={`mb-1 text-xs font-medium opacity-70 ${
                        mine ? "text-right" : ""
                      }`}
                    >
                      {m.user.name}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                    <div
                      className={`mt-1 text-[10px] opacity-60 ${
                        mine ? "text-right" : ""
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
            <div ref={endRef} />
          </div>
          <form
            onSubmit={send}
            className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              maxLength={500}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Send
            </button>
          </form>
        </div>
      </div>

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
