"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Sidebar } from "@/components/Sidebar";
import { ChatRoom } from "@/components/ChatRoom";
import { NewChatModal } from "@/components/NewChatModal";
import { GamesPanel } from "@/components/GamesPanel";
import type { Account, Room, RoomSummary } from "@/lib/types";

const TOKEN_KEY = "qchat_token";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [active, setActive] = useState<Room | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [view, setView] = useState<"chats" | "games">("chats");
  const [gameCode, setGameCode] = useState<string | null>(null);

  // On mount only: restore the session token and validate it
  useEffect(() => {
    async function boot() {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.ok) {
          const data = await res.json();
          setToken(stored);
          setAccount(data.user);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    boot();
    /* eslint-disable react-hooks/set-state-in-effect */
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code && /^\d{6}$/.test(code)) setJoinCode(code);
    const gcode = params.get("game");
    if (gcode && /^\d{6}$/.test(gcode)) {
      setGameCode(gcode);
      setView("games");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const loadRooms = useCallback(async (t: string) => {
    try {
      const res = await fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadRooms(token);
    /* eslint-enable react-hooks/set-state-in-effect */
    const interval = setInterval(() => void loadRooms(token), 8000);
    return () => clearInterval(interval);
  }, [token, loadRooms]);

  const joinByCode = useCallback(
    async (code: string) => {
      if (!token) return;
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        window.history.replaceState({}, "", "/");
        setNotice(null);
        void loadRooms(token);
        setActive(data.room);
      } else {
        setNotice(data.error || "Could not join the room");
      }
    },
    [token, loadRooms]
  );

  // Handle invite code after login
  useEffect(() => {
    if (joinCode && token) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setJoinCode(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      void joinByCode(joinCode);
    }
  }, [joinCode, token, joinByCode]);

  const handleAuthed = useCallback(
    (u: Account, t: string) => {
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setAccount(u);
      setError(null);
      void loadRooms(t);
    },
    [loadRooms]
  );

  const logout = useCallback(async () => {
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(null);
    setAccount(null);
    setActive(null);
    setRooms([]);
  }, [token]);

  const handleProfileUpdate = useCallback((u: Account) => {
    setAccount(u);
  }, []);

  const handleRemoved = useCallback(
    (message?: string) => {
      setActive(null);
      setNotice(message ?? "You were removed from the room by the admin.");
      if (token) void loadRooms(token);
    },
    [token, loadRooms]
  );

  const handleRoomCreated = useCallback(
    (room: Room) => {
      window.history.replaceState({}, "", "/");
      if (token) void loadRooms(token);
      setShowNewRoom(false);
      setActive(room);
    },
    [token, loadRooms]
  );

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
      </div>
    );
  }

  if (!account || !token) {
    return (
      <AuthScreen
        initialCode={joinCode ?? undefined}
        error={error}
        onError={setError}
        onAuthed={handleAuthed}
      />
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <Sidebar
        account={account}
        rooms={rooms}
        activeRoomId={active?.id ?? null}
        notice={notice}
        onClearNotice={() => setNotice(null)}
        onSelect={async (room) => {
          const res = await fetch(`/api/rooms/${room.code}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) setActive(data.room);
        }}
        onNewRoom={() => setShowNewRoom(true)}
        onGames={() => {
          setView("games");
          setActive(null);
        }}
        onLogout={() => void logout()}
      />

      {view === "games" ? (
        <GamesPanel
          account={account}
          token={token}
          initialCode={gameCode}
          onBack={() => {
            setGameCode(null);
            setView("chats");
          }}
          onLogout={() => void logout()}
        />
      ) : active ? (
        <ChatRoom
          key={active.id}
          account={account}
          token={token}
          room={active}
          onLeft={() => {
            setActive(null);
            if (token) void loadRooms(token);
          }}
          onRemoved={handleRemoved}
          onProfileUpdate={handleProfileUpdate}
        />
      ) : (
        <div className="relative hidden flex-1 flex-col items-center justify-center md:flex">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-pink-500 to-amber-400 text-3xl font-bold text-white shadow-lg">
              #
            </div>
            <h2 className="mt-4 text-xl font-semibold">
              Select a chat to start messaging
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Create a room, share the invite code, and chat with anyone.
            </p>
            <button
              onClick={() => setShowNewRoom(true)}
              className="mt-6 rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-6 py-2.5 font-medium text-white shadow transition-opacity hover:opacity-90"
            >
              New Room
            </button>
          </div>
          {showNewRoom && (
            <NewChatModal
              token={token}
              onClose={() => setShowNewRoom(false)}
              onCreated={handleRoomCreated}
            />
          )}
        </div>
      )}

      {showNewRoom && active && (
        <NewChatModal
          token={token}
          onClose={() => setShowNewRoom(false)}
          onCreated={handleRoomCreated}
        />
      )}
    </div>
  );
}
