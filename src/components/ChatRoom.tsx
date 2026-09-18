"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { MembersPanel } from "@/components/MembersPanel";
import { ProfilePanel } from "@/components/ProfilePanel";
import MediaViewerModal from "@/components/MediaViewerModal";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import { downloadFileBlob } from "@/lib/downloadHelper";
import { useChatSecurity, Watermark } from "@/components/useChatSecurity";
import type { Account, ChatMessage, Room, RoomUser } from "@/lib/types";

type ChatRoomProps = {
  account: Account;
  token: string;
  room: Room;
  initialDraft?: string | null;
  onClearDraft?: () => void;
  onBack?: () => void;
  onLeft: () => void;
  onRemoved: (message?: string) => void;
  onProfileUpdate: (user: Account) => void;
};

export function ChatRoom({
  account,
  token,
  room,
  initialDraft,
  onClearDraft,
  onBack,
  onLeft,
  onRemoved,
  onProfileUpdate,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomUser[]>(room.members);
  const [input, setInput] = useState(initialDraft ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{
    src: string;
    alt?: string;
    fileName?: string;
  } | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{
    src: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      setInput(initialDraft);
      onClearDraft?.();
    }
  }, [initialDraft, onClearDraft]);
  const [info, setInfo] = useState<string | null>(null);
  const [securityToast, setSecurityToast] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [leftRoom, setLeftRoom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = account.id === room.adminId;
  const isDm = room.kind === "dm" || room.kind === "temp_dm" || room.name.startsWith("[DM] ");
  const shareUrlText = `${window.location.origin}/?room=${room.code}`;

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        setInfo("Notifications enabled!");
        setTimeout(() => setInfo(null), 2500);
      }
    }
  };

  const postSystemNotice = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: text, roomId: room.id }),
        });
        if (res.ok) {
          const message = (await res.json()) as ChatMessage;
          setMessages((prev) => [...prev, message]);
        }
      } catch {
        // ignore
      }
    },
    [token, room.id]
  );

  const handleCopyDetected = useCallback(() => {
    setSecurityToast("📋 Copied to clipboard! Notification sent to chat.");
    void postSystemNotice(`📋 ${account.name} copied text from the chat`);
  }, [account.name, postSystemNotice]);

  const handleScreenshotDetected = useCallback(() => {
    setSecurityToast("📸 Screenshot detected! Notification sent to chat.");
    void postSystemNotice(`📸 ${account.name} took a screenshot!`);
  }, [account.name, postSystemNotice]);

  useChatSecurity({
    active: true,
    onCopy: handleCopyDetected,
    onScreenshot: handleScreenshotDetected,
  });

  useEffect(() => {
    if (!securityToast) return;
    const t = setTimeout(() => {
      setSecurityToast(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [securityToast]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(dist < 80);
  }, []);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      if (atBottom) scrollToBottom();
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, atBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?roomId=${room.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ChatMessage[];
        setMessages((prev) => {
          // If message counts match, check if all fields are identical to prevent re-render
          if (prev.length === data.length) {
            let identical = true;
            for (let i = 0; i < prev.length; i++) {
              const p = prev[i];
              const d = data[i];
              if (
                !d ||
                p.id !== d.id ||
                p.content !== d.content ||
                p.isPermanent !== d.isPermanent ||
                p.fileUrl !== d.fileUrl ||
                p.sending
              ) {
                identical = false;
                break;
              }
            }
            if (identical) return prev;
          }

          // Preserve any in-flight optimistic messages that have not yet landed
          const pendingOptimistic = prev.filter((m) => m.id.startsWith("optimistic-"));
          if (pendingOptimistic.length > 0) {
            const stillPending = pendingOptimistic.filter(
              (opt) => !data.some((d) => d.content === opt.content && d.userId === opt.userId)
            );
            return [...data, ...stillPending];
          }

          return data;
        });
      }
    } catch {
      // ignore
    }
  }, [room.id, token]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${room.code}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 404) {
        onRemoved("This room was closed by its admin.");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { room: Room };
        setMembers((prev) => {
          if (
            prev.length === data.room.members.length &&
            prev.every((m, idx) => m.id === data.room.members[idx]?.id && m.name === data.room.members[idx]?.name)
          ) {
            return prev;
          }
          return data.room.members;
        });
        if (!data.room.members.some((u) => u.id === account.id)) {
          onRemoved();
        }
      }
    } catch {
      // ignore
    }
  }, [room.code, account.id, token, onRemoved]);

  useEffect(() => {
    const m = setInterval(loadMessages, 3000);
    const u = setInterval(loadMembers, 10000);
    return () => {
      clearInterval(m);
      clearInterval(u);
    };
  }, [loadMessages, loadMembers]);

  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > lastMsgCountRef.current && lastMsgCountRef.current > 0) {
      const latest = messages[messages.length - 1];
      if (
        latest &&
        latest.user.id !== account.id &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        try {
          new Notification(`${latest.user.name} (${room.name})`, {
            body: latest.content,
            icon: latest.user.avatar || "/icons/icon-192.png",
          });
        } catch {
          // ignore
        }
      }
    }
    lastMsgCountRef.current = messages.length;
  }, [messages, account.id, room.name]);

  const uploadAndSendFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setInfo("File size exceeds 25MB limit.");
      setTimeout(() => setInfo(null), 3500);
      return;
    }

    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let localBlobUrl: string | undefined;
    try {
      localBlobUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }

    const optimisticMsg: ChatMessage = {
      id: tempId,
      roomId: room.id,
      userId: account.id,
      content: `Sent ${file.name}`,
      createdAt: new Date().toISOString(),
      user: account,
      fileUrl: localBlobUrl,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      isPermanent: false,
      sending: true,
    };

    // Show immediately in chat!
    setMessages((prev) => [...prev, optimisticMsg]);
    setAtBottom(true);
    scrollToBottom();
    setUploading(true);

    try {
      let attachmentData: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      } = {};

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (uploadRes.ok) {
        attachmentData = await uploadRes.json();
      } else {
        // Instant data URL fallback
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        attachmentData = {
          fileUrl: dataUrl,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        };
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: attachmentData.fileName ? `Sent ${attachmentData.fileName}` : "Sent an attachment",
          roomId: room.id,
          ...attachmentData,
        }),
      });

      if (res.ok) {
        const message = (await res.json()) as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? message : m)));
        setInfo(null);
      } else {
        const data = await res.json().catch(() => null);
        setInfo(data?.error || "Could not send attachment.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.error("Upload & send error:", err);
      setInfo("Failed to send file. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setUploading(false);
      removePendingFile();
    }
  };

  const handleFileSelect = (file: File) => {
    void uploadAndSendFile(file);
  };

  const startEditing = (m: ChatMessage) => {
    setEditingMessageId(m.id);
    setEditText(m.content.replace(" (edited)", ""));
    setActiveMessageMenuId(null);
  };

  const saveEdit = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "edit", content: editText.trim() }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, content: message.content } : msg))
        );
        setEditingMessageId(null);
      } else {
        const d = await res.json().catch(() => null);
        setInfo(d?.error || "Failed to edit message");
      }
    } catch {
      setInfo("Failed to edit message");
    }
  };

  const togglePermanentMessage = async (messageId: string) => {
    setActiveMessageMenuId(null);
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "toggle_permanent" }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isPermanent: message.isPermanent } : msg
          )
        );
        setInfo(message.isPermanent ? "Message kept permanently! 📌" : "Message will expire in 24h.");
        setTimeout(() => setInfo(null), 2500);
      }
    } catch {
      // ignore
    }
  };

  const deleteMessage = async (messageId: string) => {
    setActiveMessageMenuId(null);
    if (!window.confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch {
      // ignore
    }
  };

  const removePendingFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setPendingFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelect(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content && !pendingFile) return;

    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let optimisticFileUrl: string | undefined;

    if (pendingFile) {
      try {
        optimisticFileUrl = URL.createObjectURL(pendingFile);
      } catch {
        // ignore
      }
    }

    const optimisticMessage: ChatMessage = {
      id: tempId,
      roomId: room.id,
      userId: account.id,
      content: content || (pendingFile ? `Sent ${pendingFile.name}` : "Sent an attachment"),
      createdAt: new Date().toISOString(),
      user: account,
      fileUrl: optimisticFileUrl,
      fileName: pendingFile?.name,
      fileType: pendingFile?.type,
      fileSize: pendingFile?.size,
      isPermanent: false,
      sending: true,
    };

    // Instant UI display!
    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    const fileToSend = pendingFile;
    removePendingFile();
    setAtBottom(true);
    scrollToBottom();

    let attachmentData: {
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    } = {};

    if (fileToSend) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", fileToSend);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => null);
          setInfo(errData?.error || "Failed to upload file.");
          setUploading(false);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }

        attachmentData = await uploadRes.json();
      } catch {
        setInfo("Error uploading file. Please try again.");
        setUploading(false);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content || (attachmentData.fileName ? `Sent ${attachmentData.fileName}` : "Sent an attachment"),
          roomId: room.id,
          ...attachmentData,
        }),
      });
      if (res.ok) {
        const message = (await res.json()) as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? message : m)));
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error) setInfo(data.error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const clearChat = async () => {
    const confirmed = window.confirm(
      "Clear this chat for everyone? All messages will be permanently deleted for both sides. This cannot be undone."
    );
    if (!confirmed) return;
    const res = await fetch(`/api/rooms/${room.code}/clear`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMessages([]);
      setInfo("Chat cleared for everyone.");
      setTimeout(() => setInfo(null), 2000);
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) setInfo(data.error);
    }
  };

  const leave = useCallback(() => {
    if (leftRoom) return;
    setLeftRoom(true);
    void fetch(`/api/users/${account.id}/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomId: room.id }),
    }).finally(() => onLeft());
  }, [account.id, token, room.id, onLeft, leftRoom]);

  const removeUser = async (userId: string) => {
    const res = await fetch(`/api/rooms/${room.code}/remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { users: RoomUser[] };
      setMembers(data.users);
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) setInfo(data.error);
    }
  };

  const saveProfile = async (name: string, avatar: string | null) => {
    const res = await fetch(`/api/users/${account.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, avatar }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Account;
      onProfileUpdate(updated);
      setMembers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.user.id === updated.id ? { ...m, user: updated } : m
        )
      );
      setShowProfile(false);
    }
  };

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="relative flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-4 sm:py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
            title="Back to chats"
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
        )}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-sm font-bold text-white shadow-sm">
          {room.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">{room.name}</h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <button
              onClick={copyLink}
              className="font-mono font-medium hover:text-zinc-900 dark:hover:text-zinc-50"
              title="Copy invite link"
            >
              #{room.code}
            </button>
            <span>· {members.length} member{members.length === 1 ? "" : "s"}</span>
            {isAdmin && !isDm && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Admin
              </span>
            )}
            {isDm && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Private
              </span>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex md:items-center md:gap-1.5">
          {!isDm && (
            <button
              onClick={copyLink}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {copied ? "Copied" : "Invite"}
            </button>
          )}
          <button
            onClick={clearChat}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Clear Chat
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Profile
          </button>
          <button
            onClick={requestNotifications}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              notifPermission === "granted"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
            title="Enable browser notifications"
          >
            {notifPermission === "granted" ? "🔔 Notifications On" : "🔔 Alerts"}
          </button>
          {!isDm && (
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Members ({members.length})
            </button>
          )}
          <button
            onClick={() => {
              if (
                isAdmin &&
                !window.confirm(
                  "Leaving will delete this room and all messages for everyone. Continue?"
                )
              ) {
                return;
              }
              leave();
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Leave
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 md:hidden">
          {!isDm && (
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              title="Members"
            >
              👥 <span>{members.length}</span>
            </button>
          )}
          {!isDm && (
            <button
              onClick={copyLink}
              className="flex h-8 items-center rounded-full bg-indigo-50 px-2.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              title="Invite"
            >
              {copied ? "Copied!" : "Invite"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Room Options"
          >
            ⋮
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-3 top-12 z-50 w-48 rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void requestNotifications();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                🔔 {notifPermission === "granted" ? "Notifications On" : "Enable Notifications"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowProfile(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                👤 Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  clearChat();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                🧹 Clear Chat
              </button>
              {!isDm && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copyLink();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  🔗 Copy Invite Link
                </button>
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    isAdmin &&
                    !window.confirm(
                      "Leaving will delete this room and all messages for everyone. Continue?"
                    )
                  ) {
                    return;
                  }
                  leave();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                🚪 Leave Room
              </button>
            </div>
          </>
        )}
      </header>

      {info && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {info}
        </div>
      )}

      {securityToast && (
        <div className="absolute left-1/2 top-14 z-50 -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs dark:bg-white/90 dark:text-zinc-900">
          {securityToast}
        </div>
      )}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-600/80 text-white backdrop-blur-xs transition-all pointer-events-none">
            <svg
              className="h-16 w-16 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-lg font-semibold">Drop files here to send</p>
            <p className="text-xs text-indigo-100">Photos, videos, audio, or documents up to 25MB</p>
          </div>
        )}

        {showMembers && (
          <MembersPanel
            members={members}
            currentUserId={account.id}
            adminId={room.adminId}
            onRemove={removeUser}
            onClose={() => setShowMembers(false)}
          />
        )}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <Watermark text={account.name} />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative z-10 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <Logo size="lg" className="shadow-md" />
                <p className="mt-3 text-sm font-medium text-zinc-500">
                  No messages yet.
                </p>
                <p className="text-sm text-zinc-400">
                  {isDm
                    ? "This is your private chat. Say hello!"
                    : `Share the invite link (#${room.code}) to bring people in.`}
                </p>
              </div>
            )}
            {messages.map((m) => {
              const isSecurityNotice =
                m.content.startsWith("📸 ") || m.content.startsWith("📋 ");
              if (isSecurityNotice) {
                return (
                  <div key={m.id} className="my-2.5 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200/90 px-3.5 py-1 text-xs font-medium text-zinc-700 shadow-xs dark:bg-zinc-800/90 dark:text-zinc-300">
                      {m.content}
                    </span>
                  </div>
                );
              }

              const mine = m.user.id === account.id;
              const hasFile = !!m.fileUrl;
              const isImage = m.fileType?.startsWith("image/") || (m.fileUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(m.fileUrl));
              const isAudio = m.fileType?.startsWith("audio/") || (m.fileUrl && /\.(mp3|wav|ogg|m4a|aac)$/i.test(m.fileUrl));
              const isVideo = m.fileType?.startsWith("video/") || (m.fileUrl && /\.(mp4|webm|mov|mkv)$/i.test(m.fileUrl));

              return (
                <div
                  key={m.id}
                  className={`group relative flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar name={m.user.name} avatar={m.user.avatar} size="sm" />
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-sm bg-gradient-to-br from-indigo-600 to-pink-500 text-white"
                        : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    {/* Header: Author name + Three dots button */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-medium opacity-80 ${mine ? "text-white/90" : ""}`}>
                        {m.user.name}
                      </span>

                      {/* WhatsApp Style 3-Dots Action Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMessageMenuId(activeMessageMenuId === m.id ? null : m.id)}
                          className={`rounded-full p-1 transition-opacity ${
                            activeMessageMenuId === m.id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          } ${
                            mine
                              ? "hover:bg-white/20 text-white/90"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500"
                          }`}
                          title="Message options"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Message Action Dropdown */}
                        {activeMessageMenuId === m.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveMessageMenuId(null)}
                            />
                            <div
                              className={`absolute ${
                                mine ? "right-0" : "left-0"
                              } top-6 z-40 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900`}
                            >
                              {mine && (
                                <button
                                  type="button"
                                  onClick={() => startEditing(m)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                  ✏️ Edit message
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void togglePermanentMessage(m.id)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                {m.isPermanent ? "📌 Remove Permanent" : "📌 Keep in Chat (Permanent)"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard.writeText(m.content);
                                  setActiveMessageMenuId(null);
                                  setInfo("Copied text!");
                                  setTimeout(() => setInfo(null), 1500);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                📋 Copy text
                              </button>
                              {(mine || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => void deleteMessage(m.id)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                                >
                                  🗑️ Delete message
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Image Attachment */}
                    {hasFile && isImage && (
                      <div className="mb-2 overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.fileUrl!}
                          alt={m.fileName || "Photo"}
                          className="max-h-72 w-auto max-w-full cursor-pointer rounded-xl object-cover transition-transform hover:scale-[1.02] shadow-sm"
                          onClick={() =>
                            setViewerMedia({
                              src: m.fileUrl!,
                              alt: m.fileName || "Photo",
                              fileName: m.fileName || undefined,
                            })
                          }
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Video Attachment */}
                    {hasFile && isVideo && (
                      <div className="mb-2 overflow-hidden rounded-xl bg-black/40">
                        <video
                          src={m.fileUrl!}
                          controls
                          className="max-h-72 max-w-full rounded-xl"
                        />
                      </div>
                    )}

                    {/* Audio Attachment */}
                    {hasFile && isAudio && (
                      <div className="mb-2">
                        <audio
                          src={m.fileUrl!}
                          controls
                          className="max-w-full w-64 sm:w-72"
                        />
                      </div>
                    )}

                    {/* Generic Document / File Attachment */}
                    {hasFile && !isImage && !isVideo && !isAudio && (
                      <div
                        onClick={() => {
                          if (m.fileUrl) {
                            setViewerDoc({
                              src: m.fileUrl,
                              fileName: m.fileName || "document",
                              fileType: m.fileType || "",
                              fileSize: m.fileSize || undefined,
                            });
                          }
                        }}
                        className={`mb-2 flex items-center justify-between gap-3 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          mine
                            ? "bg-white/15 text-white hover:bg-white/20"
                            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 dark:bg-zinc-700/60 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                        title="Tap to view or download document"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-xs uppercase shadow-sm ${
                              (m.fileName || "").toLowerCase().endsWith(".pdf") || (m.fileType || "").includes("pdf")
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            }`}
                          >
                            {(m.fileName || "").toLowerCase().endsWith(".pdf") || (m.fileType || "").includes("pdf") ? (
                              <span>PDF</span>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{m.fileName || "Attachment"}</p>
                            <div className="flex items-center gap-2 text-[10px] opacity-75">
                              {m.fileSize && (
                                <span>{(m.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                              )}
                              <span>• Tap to preview</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.fileUrl) {
                              void downloadFileBlob(m.fileUrl, m.fileName || "document");
                            }
                          }}
                          className={`shrink-0 rounded-full p-2 transition-colors ${
                            mine
                              ? "hover:bg-white/20 text-white"
                              : "hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200"
                          }`}
                          title="Download document to device"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Message text content or Inline Edit mode */}
                    {editingMessageId === m.id ? (
                      <div className="my-1.5 space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white/20 p-2 text-sm text-inherit outline-none focus:ring-2 focus:ring-amber-400"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="rounded-md bg-black/20 px-2 py-1 text-xs font-medium hover:bg-black/30"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEdit(m.id)}
                            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-white/90"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      m.content && (!hasFile || m.content !== `Sent ${m.fileName}`) && (
                        <div className="whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                      )
                    )}

                    {/* Footer: timestamp + pin icon + sending state */}
                    <div
                      className={`mt-1 flex items-center gap-1.5 text-[10px] opacity-75 ${
                        mine ? "justify-end text-white/90" : "justify-start"
                      }`}
                    >
                      {m.sending ? (
                        <span className="flex items-center gap-1 text-[10px] italic">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent inline-block" />
                          <span>Sending...</span>
                        </span>
                      ) : (
                        <>
                          {m.isPermanent && (
                            <span title="Permanent (Won't expire in 24h)" className="text-[11px]">
                              📌
                            </span>
                          )}
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staged File Preview Banner */}
          {pendingFile && (
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="flex items-center gap-3 min-w-0">
                {filePreviewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={filePreviewUrl}
                    alt="Staged preview"
                    className="h-10 w-10 shrink-0 rounded-lg object-cover border border-zinc-300 dark:border-zinc-700"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {pendingFile.name}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {(pendingFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removePendingFile}
                disabled={uploading}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                title="Remove attachment"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Hidden File Inputs for Device Picker */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {/* WhatsApp-Style Attach Popup Menu */}
          {attachMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setAttachMenuOpen(false)}
              />
              <div className="absolute bottom-16 left-3 z-40 flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:left-4">
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Photos & Images</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    videoInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Videos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    docInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span>Document (PDF / Office)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span>Any File from Device</span>
                </button>
              </div>
            </>
          )}

          {/* Chat Message Input Bar */}
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-zinc-200 bg-white p-2.5 sm:p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* WhatsApp-Style '+' Attach Button */}
            <button
              type="button"
              onClick={() => setAttachMenuOpen((v) => !v)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                attachMenuOpen
                  ? "bg-indigo-600 text-white rotate-45 transform duration-200"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
              }`}
              title="Attach files, photos, videos, documents"
              aria-label="Attach menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingFile ? "Add a caption (optional)..." : `Message ${room.name}`}
              maxLength={500}
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-400 dark:focus:bg-zinc-800"
            />

            <button
              type="submit"
              disabled={(!input.trim() && !pendingFile) || uploading}
              className="flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {uploading ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="hidden sm:inline">Uploading...</span>
                </div>
              ) : (
                "Send"
              )}
            </button>
          </form>
        </div>
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-4 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-md transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Jump to latest
        </button>
      )}

      {showProfile && (
        <ProfilePanel
          user={account}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Full-Screen Media Viewer Lightbox */}
      {viewerMedia && (
        <MediaViewerModal
          src={viewerMedia.src}
          alt={viewerMedia.alt}
          fileName={viewerMedia.fileName}
          onClose={() => setViewerMedia(null)}
        />
      )}

      {/* WhatsApp-Style In-App Document & PDF Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          src={viewerDoc.src}
          fileName={viewerDoc.fileName}
          fileType={viewerDoc.fileType}
          fileSize={viewerDoc.fileSize}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </main>
  );
}