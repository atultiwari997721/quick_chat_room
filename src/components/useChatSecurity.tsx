"use client";

import { useEffect, useState } from "react";

export function useChatSecurity(active: boolean, onBlocked: () => void) {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!active) return;

    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (
        (mod && ["c", "s", "p", "a"].includes(key)) ||
        key === "printscreen" ||
        key === "f12"
      ) {
        e.preventDefault();
        onBlocked();
      }
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      onBlocked();
    };

    const onDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("dragstart", onDrag);

    const onVisibility = () => {
      if (document.hidden) {
        setToast(true);
        onBlocked();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, onBlocked]);

  return toast;
}

export function Watermark({ text }: { text: string }) {
  const row = Array.from({ length: 6 });
  const col = Array.from({ length: 5 });
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
      style={{
        background: "transparent",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {row.map((_, r) => (
        <div
          key={r}
          className="flex items-center justify-center gap-8 whitespace-nowrap"
          style={{ marginTop: r % 2 === 1 ? 40 : 0 }}
        >
          {col.map((_, c) => (
            <span
              key={c}
              className="text-2xl font-bold text-zinc-900/5 dark:text-white/5"
              style={{ transform: "rotate(-12deg)" }}
            >
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
