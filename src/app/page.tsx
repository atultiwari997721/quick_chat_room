"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string };
};

export default function Home() {
  const [userName, setUserName] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chat-user-name");
    if (!stored) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setUserName(stored);
    setIsSignedIn(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ChatMessage[];
        if (!cancelled) setMessages(data);
      } catch {
        // ignore poll errors
      }
    };
    load();
    const interval = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSignedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const name = userName.trim();
    if (!name) return;
    localStorage.setItem("chat-user-name", name);
    setIsSignedIn(true);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userName }),
      });
      if (res.ok) {
        const message = (await res.json()) as ChatMessage;
        setMessages((prev) => [...prev, message]);
      }
    } catch {
      // ignore send errors
    }
  };

  if (!isSignedIn) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <form
          onSubmit={handleJoin}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h1 className="text-2xl font-semibold">Join the chat</h1>
          <p className="text-sm text-zinc-500">
            Enter a display name to get started.
          </p>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-6">
      <div className="flex w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h1 className="font-semibold">Chat room</h1>
          <button
            onClick={() => {
              localStorage.removeItem("chat-user-name");
              setIsSignedIn(false);
            }}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Leave as {userName}
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((m) => {
            const mine = m.user.name === userName;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  }`}
                >
                  <div className="mb-1 text-xs font-medium opacity-70">
                    {m.user.name}
                  </div>
                  {m.content}
                </div>
                <div className="mt-1 px-1 text-xs text-zinc-400">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={handleSend}
          className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            maxLength={500}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
