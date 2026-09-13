"use client";

import { useEffect, useState } from "react";

type UseChatSecurityProps = {
  active: boolean;
  onCopy?: () => void;
  onScreenshot?: () => void;
};

export function useChatSecurity({
  active,
  onCopy,
  onScreenshot,
}: UseChatSecurityProps) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let lastCopyTime = 0;
    let lastScreenshotTime = 0;

    const handleCopy = () => {
      const now = Date.now();
      // Debounce within 4 seconds so rapid Ctrl+C doesn't spam
      if (now - lastCopyTime > 4000) {
        lastCopyTime = now;
        onCopy?.();
      }
    };

    const handleScreenshot = () => {
      const now = Date.now();
      if (now - lastScreenshotTime > 4000) {
        lastScreenshotTime = now;
        onScreenshot?.();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // PrintScreen key
      if (key === "printscreen" || e.code === "PrintScreen") {
        handleScreenshot();
        return;
      }

      // Windows Snipping tool (Shift+Win+S or Shift+Ctrl+S), macOS Shift+Cmd+3/4/5
      if (e.shiftKey && isCmdOrCtrl && ["s", "3", "4", "5"].includes(key)) {
        handleScreenshot();
        return;
      }
    };

    // Allow copying, but notify when it happens
    document.addEventListener("copy", handleCopy);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, onCopy, onScreenshot]);

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
