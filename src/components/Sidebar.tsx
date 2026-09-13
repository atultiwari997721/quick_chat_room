"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Account, RoomSummary } from "@/lib/types";

type SidebarProps = {
  account: Account;
  rooms: RoomSummary[];
  activeRoomId: string | null;
  notice: string | null;
  currentView?: "chats" | "games" | "people";
  className?: string;
  onClearNotice: () => void;
  onSelect: (room: RoomSummary) => void;
  onNewRoom: () => void;
  onSelectView?: (view: "chats" | "games" | "people") => void;
  onGames?: () => void;
  onPeople?: () => void;
  onProfileClick?: () => void;
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
  currentView = "chats",
  className = "",
  onClearNotice,
  onSelect,
  onNewRoom,
  onSelectView,
  onGames,
  onPeople,
  onProfileClick,
  onLogout,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const handleGoPeople = () => {
    if (onSelectView) onSelectView("people");
    else onPeople?.();
  };

  const handleGoGames = () => {
    if (onSelectView) onSelectView("games");
    else onGames?.();
  };

  const handleGoChats = () => {
    if (onSelectView) onSelectView("chats");
  };

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
    <aside
      className={`relative flex h-full w-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:w-80 lg:w-96 ${className}`}
    >
      {/* Header with profile and primary actions */}
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={onProfileClick}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
          title="Click to edit profile"
        >
          <div className="relative">
            <Avatar name={account.name} avatar={account.avatar} ring />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900"
              title="Online"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{account.name}</p>
            <p className="truncate text-xs text-zinc-500">@{account.username}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onNewRoom}
          title="Create or Join Room"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-500 text-lg font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          +
        </button>

        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
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

      {/* Desktop / tablet navigation tabs */}
      <nav className="hidden border-b border-zinc-200 px-3 py-2 dark:border-zinc-800 md:flex md:items-center md:gap-1.5">
        <button
          type="button"
          onClick={handleGoChats}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            currentView === "chats"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          💬 Chats ({rooms.length})
        </button>
        <button
          type="button"
          onClick={handleGoPeople}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            currentView === "people"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          👥 People
        </button>
        <button
          type="button"
          onClick={handleGoGames}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            currentView === "games"
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          🎮 Games
        </button>
      </nav>

      {/* Search Bar */}
      <div className="px-4 py-2.5">
        <div className="relative flex items-center">
          <svg
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms or codes…"
            className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-9 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800/70 dark:focus:border-indigo-400 dark:focus:bg-zinc-800"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Your chats
        </h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {filtered.length}
        </span>
      </div>

      {/* Chat Rooms List */}
      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto pb-20 dark:divide-zinc-800/60 md:pb-4">
        {filtered.length === 0 && (
          <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-zinc-800 dark:text-indigo-400">
              💬
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {rooms.length === 0
                ? "No chats yet"
                : "No rooms match your search"}
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-zinc-400">
              {rooms.length === 0
                ? "Tap + to create a room or join one with a 6-digit code."
                : "Try searching by room name or code."}
            </p>
            {rooms.length === 0 && (
              <button
                type="button"
                onClick={onNewRoom}
                className="mt-4 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition-opacity hover:opacity-90"
              >
                Create / Join Room
              </button>
            )}
          </li>
        )}

        {filtered.map((room) => {
          const isSelected = activeRoomId === room.id;
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onSelect(room)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800 ${
                  isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/50"
                    : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-base font-bold text-white shadow-sm">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  {room.adminId && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950 shadow-xs"
                      title="Admin"
                    >
                      A
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-sm ${isSelected ? "font-semibold text-indigo-600 dark:text-indigo-400" : "font-medium"}`}>
                      {room.name}
                    </p>
                    {room.lastMessage && (
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        {timeAgo(room.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {room.lastMessage
                        ? `${room.lastMessage.author}: ${room.lastMessage.content}`
                        : "No messages yet"}
                    </p>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      #{room.code} · {room.memberCount}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Floating Action Button (FAB) on mobile for quick Room Creation */}
      <button
        type="button"
        onClick={onNewRoom}
        aria-label="Create or join room"
        className="fixed bottom-20 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-500 text-2xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
      >
        +
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden">
        <button
          type="button"
          onClick={handleGoChats}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors ${
            currentView === "chats"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <span className="text-xl leading-none">💬</span>
          <span className="text-[11px] font-medium">Chats</span>
        </button>

        <button
          type="button"
          onClick={handleGoPeople}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors ${
            currentView === "people"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <span className="text-xl leading-none">👥</span>
          <span className="text-[11px] font-medium">People</span>
        </button>

        <button
          type="button"
          onClick={handleGoGames}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors ${
            currentView === "games"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <span className="text-xl leading-none">🎮</span>
          <span className="text-[11px] font-medium">Games</span>
        </button>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <span className="text-xl leading-none">👤</span>
          <span className="text-[11px] font-medium">Profile</span>
        </button>
      </nav>
    </aside>
  );
}