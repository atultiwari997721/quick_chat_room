"use client";

import { FormEvent, useState } from "react";
import type { Room } from "@/lib/types";

type NewChatModalProps = {
  token: string;
  onClose: () => void;
  onCreated: (room: Room) => void;
};

export function NewChatModal({ token, onClose, onCreated }: NewChatModalProps) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [isTemporary, setIsTemporary] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "create" ? "/api/rooms" : "/api/rooms/join",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "create" ? { roomName: roomName.trim(), isTemporary } : { code: code.trim() }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      onCreated(data.room);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {mode === "create" ? "New room" : "Join a room"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === "create"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === "join"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            Join
          </button>
        </div>

        {mode === "create" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Room name</span>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Family Group"
                maxLength={50}
                className="rounded-lg border border-zinc-300 px-4 py-2 outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isTemporary}
                onChange={(e) => setIsTemporary(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Temporary Room (Deletes in 24 hours)
              </span>
            </label>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">6-digit room code</span>
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              required
              className="rounded-lg border border-zinc-300 px-4 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
            />
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || (mode === "join" && code.length !== 6)}
          className="rounded-lg bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Please wait…" : mode === "create" ? "Create Room" : "Join Room"}
        </button>
      </form>
    </div>
  );
}