"use client";

import { FormEvent, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/image";
import type { Account } from "@/lib/types";

type AuthScreenProps = {
  initialCode?: string;
  error: string | null;
  onError: (message: string | null) => void;
  onAuthed: (user: Account, token: string) => void;
};

export function AuthScreen({
  initialCode,
  error,
  onError,
  onAuthed,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await fileToDataUrl(file));
    } catch {
      setAvatar(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onError(null);
    try {
      const isRegister = mode === "register";
      const res = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            name: name.trim() || undefined,
            avatar: isRegister ? avatar : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Something went wrong");
        return;
      }
      onAuthed(data.user, data.token);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    onError(null);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-indigo-50 p-6 dark:from-black dark:via-zinc-950 dark:to-indigo-950">
      <form
        onSubmit={submit}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 p-[3px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-bold text-zinc-900 dark:bg-zinc-900 dark:text-white">
              #
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "login"
              ? "Log in to continue chatting"
              : "Join Quick Chat with your own account"}
          </p>
          {initialCode && (
            <p className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              You were invited to a room
            </p>
          )}
        </div>

        {mode === "register" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
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
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-zinc-400 dark:bg-zinc-900">
                    +
                  </div>
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
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            placeholder="your_username"
            maxLength={20}
            required
            autoComplete="username"
            className="rounded-lg border border-zinc-300 px-4 py-2 outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
            minLength={6}
            required
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            className="rounded-lg border border-zinc-300 px-4 py-2 outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username.trim() || password.length < 6}
          className="rounded-lg bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Log In"
              : "Create Account"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}