"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { OtherUser, RoomSummary } from "@/lib/types";

type PeoplePanelProps = {
  token: string;
  onBack: () => void;
  onOpenDm: (room: {
    id: string;
    code: string;
    name: string;
    kind: string;
    adminId: string | null;
    createdAt: string;
    members: { id: string; name: string; avatar: string | null; createdAt: string }[];
  }) => void;
};

type FollowState = {
  incoming: { id: string; follower: OtherUser }[];
  outgoing: { id: string; followee: OtherUser }[];
  following: { id: string; user: OtherUser }[];
};

const EMPTY: FollowState = { incoming: [], outgoing: [], following: [] };

export function PeoplePanel({ token, onBack, onOpenDm }: PeoplePanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OtherUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [follows, setFollows] = useState<FollowState>(EMPTY);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFollows = useCallback(async () => {
    try {
      const res = await fetch("/api/follows", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as FollowState;
        setFollows({
          incoming: data.incoming ?? [],
          outgoing: data.outgoing ?? [],
          following: data.following ?? [],
        });
      }
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadFollows();
    /* eslint-enable react-hooks/set-state-in-effect */
    const interval = setInterval(() => void loadFollows(), 5000);
    return () => clearInterval(interval);
  }, [loadFollows]);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.users ?? []);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const t = setTimeout(() => void search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  const relation = useCallback(
    (userId: string): "me" | "following" | "outgoing" | "none" => {
      if (follows.following.some((f) => f.user.id === userId)) return "following";
      if (follows.outgoing.some((f) => f.followee.id === userId)) return "outgoing";
      return "none";
    },
    [follows]
  );

  const sendRequest = async (user: OtherUser) => {
    setBusyId(user.id);
    setError(null);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetId: user.id }),
    });
    if (res.ok) {
      setNotice("Follow request sent.");
      setTimeout(() => setNotice(null), 2000);
      await loadFollows();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not send request");
    }
    setBusyId(null);
  };

  const unfollow = async (targetId: string) => {
    setBusyId(targetId);
    setError(null);
    const res = await fetch("/api/follows", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetId }),
    });
    if (res.ok) {
      setNotice("Unfollowed successfully.");
      setTimeout(() => setNotice(null), 2000);
      await loadFollows();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not unfollow");
    }
    setBusyId(null);
  };

  const answer = async (followId: string, accept: boolean) => {
    setBusyId(followId);
    setError(null);
    const res = await fetch("/api/follows", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ followId, accept }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotice(accept ? "Request accepted! Chat opened." : "Request declined.");
      setTimeout(() => setNotice(null), 2500);
      await loadFollows();
      if (accept && data.room) {
        onOpenDm(data.room);
      }
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not update request");
    }
    setBusyId(null);
  };

  const openDmFor = async (user: OtherUser) => {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetId: user.id }),
      });
      if (res.ok) {
        const { room } = await res.json();
        onOpenDm(room);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not open chat");
      }
    } catch {
      setError("Could not open chat. Check connection.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center gap-2.5 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title="Back"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold sm:text-lg">People</h1>
          <p className="truncate text-xs text-zinc-500">
            Search users, send requests, and chat privately
          </p>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </div>
      )}

      <div className="border-b border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
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
            placeholder="Search by username or name…"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-indigo-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
        {query.trim().length >= 1 && (
          <section>
            <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Search results
            </h2>
            {searching && (
              <p className="px-4 py-4 text-sm text-zinc-400">Searching users…</p>
            )}
            {!searching && results.length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-400">No users found for &quot;{query.trim()}&quot;.</p>
            )}
            {results.map((u) => {
              const rel = relation(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Avatar name={u.name} avatar={u.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-zinc-500">@{u.username}</p>
                  </div>
                  {rel === "none" && (
                    <button
                      onClick={() => void sendRequest(u)}
                      disabled={busyId === u.id}
                      className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {busyId === u.id ? "Sending…" : "Follow"}
                    </button>
                  )}
                  {rel === "outgoing" && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                      Requested
                    </span>
                  )}
                  {rel === "following" && (
                    <button
                      onClick={() => void openDmFor(u)}
                      disabled={busyId === u.id}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {busyId === u.id ? "Opening…" : "Message"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {follows.incoming.length > 0 && (
          <section>
            <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Follow requests ({follows.incoming.length})
            </h2>
            {follows.incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={f.follower.name} avatar={f.follower.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.follower.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    @{f.follower.username} wants to follow you
                  </p>
                </div>
                <button
                  onClick={() => void answer(f.id, true)}
                  disabled={busyId === f.id}
                  className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Accept
                </button>
                <button
                  onClick={() => void answer(f.id, false)}
                  disabled={busyId === f.id}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:text-red-400"
                >
                  Decline
                </button>
              </div>
            ))}
          </section>
        )}

        {follows.outgoing.length > 0 && (
          <section>
            <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sent requests
            </h2>
            {follows.outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={f.followee.name} avatar={f.followee.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.followee.name}</p>
                  <p className="truncate text-xs text-zinc-500">@{f.followee.username}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                  Pending
                </span>
              </div>
            ))}
          </section>
        )}

        {follows.following.length > 0 && (
          <section>
            <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Following ({follows.following.length})
            </h2>
              {follows.following.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={f.user.name} avatar={f.user.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.user.name}</p>
                    <p className="truncate text-xs text-zinc-500">@{f.user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void openDmFor(f.user)}
                      disabled={busyId === f.user.id}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Unfollow @${f.user.username}?`)) {
                          void unfollow(f.user.id);
                        }
                      }}
                      disabled={busyId === f.user.id}
                      className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:text-red-400"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
          </section>
        )}
      </div>
    </main>
  );
}