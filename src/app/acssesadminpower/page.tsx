"use client";

import { useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  roomCount: number;
  messageCount: number;
  adminRooms: number;
};

type AdminRoom = {
  id: string;
  code: string;
  name: string;
  kind: string;
  createdAt: string;
  memberCount: number;
  messageCount: number;
};

type AdminStats = {
  userCount: number;
  roomCount: number;
  messageCount: number;
  dbStatus: string;
  uptime: number;
};

export default function AdminPowerPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "rooms" | "system">("users");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, action: "stats" }),
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUsers(data.users || []);
        setRooms(data.rooms || []);
        setIsAuth(true);
      } else {
        const d = await res.json().catch(() => null);
        setError(d?.error || "Access Denied: Invalid credentials");
      }
    } catch {
      setError("Network error while accessing admin portal");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Permanently delete user "${userName}" and all associated data?`)) return;
    try {
      const res = await fetch("/api/admin/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, action: "delete_user", targetUserId: userId }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
      alert("Failed to delete user");
    }
  };

  const deleteRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`Permanently delete room "${roomName}"?`)) return;
    try {
      const res = await fetch("/api/admin/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, action: "delete_room", targetRoomId: roomId }),
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
      }
    } catch {
      alert("Failed to delete room");
    }
  };

  if (!isAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-xl font-bold shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <h1 className="text-xl font-bold tracking-tight">Admin Power Portal</h1>
            <p className="mt-1 text-xs text-zinc-400">Authorized Personnel Only</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Admin ID</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin ID"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Unlock Power Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(roomQuery.toLowerCase()) ||
      r.code.includes(roomQuery)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 font-bold text-white shadow-md">
            ⚡
          </span>
          <div>
            <h1 className="text-base font-bold text-white">Admin Power Console</h1>
            <p className="text-[11px] text-zinc-400">Logged in as: {username}</p>
          </div>
        </div>

        <button
          onClick={() => setIsAuth(false)}
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
        >
          Lock & Exit
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
              <p className="text-xs text-zinc-400">Total Registered Users</p>
              <p className="mt-1 text-2xl font-black text-amber-400">{stats.userCount}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
              <p className="text-xs text-zinc-400">Active Chat Rooms</p>
              <p className="mt-1 text-2xl font-black text-indigo-400">{stats.roomCount}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
              <p className="text-xs text-zinc-400">Total Messages Sent</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{stats.messageCount}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
              <p className="text-xs text-zinc-400">Database Engine</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-semibold text-white">{stats.dbStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 gap-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "users"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            👥 Registered Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "rooms"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            💬 Chat Rooms ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "system"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🔒 Privacy & System
          </button>
        </div>

        {/* Tab: Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users by name or @username..."
                className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
              />
              <span className="text-xs text-zinc-400">Showing {filteredUsers.length} users</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3">Messages Sent</th>
                    <th className="px-4 py-3">Rooms Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                        <td className="px-4 py-3 text-zinc-400">@{u.username}</td>
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{u.messageCount}</td>
                        <td className="px-4 py-3 text-zinc-300">{u.roomCount}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteUser(u.id, u.name)}
                            className="rounded-lg bg-red-950/60 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-900/80 transition-colors"
                          >
                            Delete User
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Rooms */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                value={roomQuery}
                onChange={(e) => setRoomQuery(e.target.value)}
                placeholder="Search rooms by name or 6-digit code..."
                className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
              />
              <span className="text-xs text-zinc-400">Showing {filteredRooms.length} rooms</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Room Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Messages</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No rooms found
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-amber-400">#{r.code}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                            {r.kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{r.memberCount}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.messageCount}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteRoom(r.id, r.name)}
                            className="rounded-lg bg-red-950/60 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-900/80 transition-colors"
                          >
                            Delete Room
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: System & Privacy */}
        {activeTab === "system" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">System Architecture & Privacy Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="font-semibold text-white">⏱️ 24-Hour Ephemeral Chat Retention</p>
                <p className="text-zinc-400">
                  Temporary rooms and direct message chats automatically delete messages older than 24 hours unless a user has marked the message with &quot;Keep Permanent 📌&quot;.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="font-semibold text-white">🔔 Push Notifications</p>
                <p className="text-zinc-400">
                  Standard Web Notifications API is enabled. Users can grant browser permission to receive alerts when new messages arrive.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="font-semibold text-white">🔒 Sensor & Privacy Compliance</p>
                <p className="text-zinc-400">
                  Client camera and GPS location tracking are strictly blocked from administrative capture to comply with user privacy regulations and safety standards.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="font-semibold text-white">⚡ Auto Database Migrations</p>
                <p className="text-zinc-400">
                  Dynamic SQL migration safeguards are active, ensuring zero downtime even across serverless edge deployments.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
