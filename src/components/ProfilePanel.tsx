"use client";

import { FormEvent, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { fileToDataUrl } from "@/lib/image";
import type { RoomUser } from "@/lib/types";

type ProfilePanelProps = {
  user: RoomUser;
  onSave: (name: string, avatar: string | null) => void;
  onClose: () => void;
};

export function ProfilePanel({ user, onSave, onClose }: ProfilePanelProps) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
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
    if (!name.trim()) return;
    onSave(name.trim(), avatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Close
          </button>
        </div>

        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800">
          Your ID: <span className="font-mono font-medium">{user.id}</span>
        </p>

        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} avatar={avatar} size="lg" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {avatar ? "Change photo" : "Add photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
        </label>

        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </form>
    </div>
  );
}
