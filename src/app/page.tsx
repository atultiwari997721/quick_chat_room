"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatRoom } from "@/components/ChatRoom";
import { Landing } from "@/components/Landing";
import type { Room, RoomUser } from "@/lib/types";

const ID_KEY = "qchat_user_id";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [initialCode, setInitialCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<RoomUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sentLeaveRef = useRef(false);

  // On mount only: restore the persistent device ID and read the invite code
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedId = localStorage.getItem(ID_KEY);
    if (storedId) setUserId(storedId);

    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code && /^\d{6}$/.test(code)) {
      setMode("join");
      setInitialCode(code);
      setNotice("You were invited to a room. Enter your name to join.");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const finishSession = (nextRoom: Room, nextUser: RoomUser) => {
    localStorage.setItem(ID_KEY, nextUser.id);
    setUserId(nextUser.id);
    setRoom(nextRoom);
    setUser(nextUser);
    setError(null);
    setNotice(null);
    sentLeaveRef.current = false;
    window.history.replaceState({}, "", "/");
  };

  const handleCreate = async (name: string, avatar: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar, id: userId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create room");
        return;
      }
      finishSession(data.room, data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (
    code: string,
    name: string,
    avatar: string | null
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, avatar, id: userId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join room");
        return;
      }
      finishSession(data.room, data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = useCallback(() => {
    if (user && !sentLeaveRef.current) {
      sentLeaveRef.current = true;
      fetch(`/api/users/${user.id}/leave`, { method: "POST" }).catch(() => {});
    }
    setRoom(null);
    setUser(null);
    setNotice(null);
  }, [user]);

  const handleRemoved = useCallback(() => {
    setNotice("You were removed from the room by the admin.");
    setRoom(null);
    setUser(null);
  }, []);

  const handleProfileUpdate = useCallback((updated: RoomUser) => {
    setUser(updated);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-black">
      {notice && !room && (
        <div className="mx-4 mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {notice}
        </div>
      )}
      {room && user ? (
        <ChatRoom
          room={room}
          user={user}
          onLeft={handleLeave}
          onRemoved={handleRemoved}
          onProfileUpdate={handleProfileUpdate}
        />
      ) : (
        <Landing
          key={initialCode}
          previousId={userId}
          initialCode={initialCode}
          error={error}
          busy={busy}
          mode={mode}
          onSetMode={setMode}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      )}
    </div>
  );
}
