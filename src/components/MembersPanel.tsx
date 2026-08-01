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
  return (
    <aside className="flex w-full flex-col border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:w-64 sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="font-semibold">
          Members <span className="text-zinc-400">({users.length})</span>
        </h2>
        <button
          onClick={onClose}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
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
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Admin
                  </span>
                )}
              </div>
              {isAdmin && !isSelf && (
                <button
                  onClick={() => onRemove(u.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
