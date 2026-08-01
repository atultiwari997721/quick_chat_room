"use client";

import { FormEvent, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/image";

type LandingProps = {
  previousId: string | null;
  initialCode: string;
  error: string | null;
  busy: boolean;
  mode: "create" | "join";
  onSetMode: (mode: "create" | "join") => void;
  onCreate: (name: string, avatar: string | null) => void;
  onJoin: (code: string, name: string, avatar: string | null) => void;
};

export function Landing({
  previousId,
  initialCode,
  error,
  busy,
  mode,
  onSetMode,
  onCreate,
  onJoin,
}: LandingProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await fileToDataUrl(file));
    } catch {
      setAvatar(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "create") {
      onCreate(trimmed, avatar);
    } else {
      onJoin(code.trim(), trimmed, avatar);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-md">
            #
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Quick Chat</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create a room or join with a 6-digit code.
          </p>
          {previousId && (
            <p className="mt-3 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Your ID: {previousId.slice(-8)}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            required
            className="rounded-lg border border-zinc-300 px-4 py-2 outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
          />
        </label>

        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt="Profile"
              className="h-12 w-12 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-600">
              +
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {avatar ? "Change photo" : "Add profile photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => onSetMode("create")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === "create"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => onSetMode("join")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === "join"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            Join Room
          </button>
        </div>

        {mode === "join" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Room code</span>
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
          disabled={busy || !name.trim() || (mode === "join" && code.length !== 6)}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:hover:from-indigo-600 disabled:hover:to-violet-600"
        >
          {busy ? "Please wait…" : mode === "create" ? "Create Room" : "Join Room"}
        </button>
      </form>
    </main>
  );
}
