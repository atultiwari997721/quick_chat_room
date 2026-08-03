"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Account, RoomSummary } from "@/lib/types";

type SidebarProps = {
  account: Account;
  rooms: RoomSummary[];
  activeRoomId: string | null;
  notice: string | null;
  onClearNotice: () => void;
  onSelect: (room: RoomSummary) => void;
  onNewRoom: () => void;
  onGames: () => void;
  onPeople: () => void;
  onLogout: () => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

export function Sidebar({
  account,
  rooms,
  activeRoomId,
  notice,
  onClearNotice,
  onSelect,
  onNewRoom,
  onGames,
  onPeople,
  onLogout,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.includes(q) ||
        (r.lastMessage?.author.toLowerCase().includes(q) ?? false)
    );
  }, [rooms, query]);

  return (
    <aside className="flex w-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:w-80 lg:w-96">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Avatar
          name={account.name}
          avatar={account.avatar}
          ring
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{account.name}</p>
          <p className="truncate text-xs text-zinc-500">@{account.username}</p>
        </div>
        <button
          onClick={onNewRoom}
          title="New room"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-500 text-lg font-bold text-white shadow-md transition-transform hover:scale-105"
        >
          +
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          className="rounded-full px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
        >
          Logout
        </button>
      </header>

      {notice && (
        <div className="flex items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <span>{notice}</span>
          <button
            onClick={onClearNotice}
            className="text-xs font-medium underline"
          >
            OK
          </button>
        </div>
      )}

      <nav className="flex gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          onClick={onNewRoom}
          className="rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          New Room
        </button>
        <button
          onClick={onPeople}
          className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
        >
          👥 People
        </button>
        <button
          onClick={onGames}
          className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
        >
          🎮 Games
        </button>
      </nav>

      <div className="px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms or codes"
          className="w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-400"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Your chats
        </h2>
        <span className="text-xs text-zinc-400">{rooms.length}</span>
      </div>

      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-zinc-400">
            {rooms.length === 0
              ? "No chats yet. Create or join a room!"
              : "No rooms match your search."}
          </li>
        )}
        {filtered.map((room) => (
          <li key={room.id}>
            <button
              onClick={() => onSelect(room)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                activeRoomId === room.id ? "bg-indigo-50 dark:bg-indigo-950/60" : ""
              }`}
            >
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-sm font-bold text-white shadow">
                  {room.name.charAt(0).toUpperCase()}
                </div>
                {room.adminId && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950"
                    title="Admin"
                  >
                    A
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">{room.name}</p>
                  {room.lastMessage && (
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {timeAgo(room.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-zinc-500">
                    {room.lastMessage
                      ? `${room.lastMessage.author}: ${room.lastMessage.content}`
                      : "No messages yet"}
                  </p>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                    #{room.code} · {room.memberCount}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}