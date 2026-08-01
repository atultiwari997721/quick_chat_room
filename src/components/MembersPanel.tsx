"use client";

import { Avatar } from "@/components/Avatar";
import type { RoomUser } from "@/lib/types";

type MembersPanelProps = {
  users: RoomUser[];
  currentUserId: string;
  adminId: string | null;
  onRemove: (userId: string) => void;
  onClose: () => void;
};

export function MembersPanel({
  users,
  currentUserId,
  adminId,
  onRemove,
  onClose,
}: MembersPanelProps) {
  const isCurrentAdmin = currentUserId === adminId;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:w-72 sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="font-semibold">
          Members <span className="text-zinc-400">({users.length})</span>
        </h2>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Close
        </button>
      </div>
      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
        {users.map((u) => {
          const isAdmin = u.id === adminId;
          const isSelf = u.id === currentUserId;
          return (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={u.name} avatar={u.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.name}
                  {isSelf && <span className="text-zinc-400"> (you)</span>}
                </p>
                {isAdmin && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Admin
                  </span>
                )}
              </div>
              {isCurrentAdmin && !isSelf && (
                <button
                  onClick={() => onRemove(u.id)}
                  className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {isCurrentAdmin && (
        <p className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
          You are the admin. Only you can remove members.
        </p>
      )}
    </aside>
  );
}
