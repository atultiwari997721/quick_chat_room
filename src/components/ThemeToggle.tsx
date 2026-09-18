"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    if (currentlyDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  if (!mounted) {
    return <div className={`h-8 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer select-none items-center rounded-full p-0.5 transition-colors duration-500 ease-in-out focus:outline-none shadow-inner overflow-hidden ${
        isDark ? "bg-[#1f2633]" : "bg-[#549be6]"
      } ${className}`}
      style={{
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Day Background: Sky with Clouds */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Soft background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4793db] to-[#68a7e8]" />
        
        {/* Fluffy clouds at bottom right */}
        <div className="absolute -bottom-2 right-1 flex items-end">
          <span className="h-4 w-4 rounded-full bg-white/60" />
          <span className="-ml-1 h-5 w-6 rounded-full bg-white/80" />
          <span className="-ml-1.5 h-6 w-7 rounded-full bg-white shadow-sm" />
          <span className="-ml-2 h-4 w-5 rounded-full bg-white/90" />
        </div>
        <div className="absolute -bottom-3 right-6 h-3 w-5 rounded-full bg-white/40" />
      </div>

      {/* Night Background: Stars */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#141923] to-[#222b3a]" />
        
        {/* Star 1 (Big Sparkle on left) */}
        <div className="absolute left-2.5 top-2">
          <svg className="h-2 w-2 text-white/90" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>

        {/* Star 2 (Small sparkle) */}
        <div className="absolute left-5 top-4">
          <svg className="h-1.5 w-1.5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>

        {/* Small Dot Stars */}
        <span className="absolute left-2 bottom-2 h-1 w-1 rounded-full bg-white/70" />
        <span className="absolute left-7 top-1.5 h-0.5 w-0.5 rounded-full bg-white/60" />
        <span className="absolute left-6 bottom-1.5 h-0.5 w-0.5 rounded-full bg-white/50" />
      </div>

      {/* Sliding Orb: Sun (left) <-> Moon (right) */}
      <div
        className={`pointer-events-none relative z-10 h-7 w-7 rounded-full shadow-md transition-all duration-500 ease-in-out ${
          isDark
            ? "translate-x-8 bg-[#d6dbe4] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            : "translate-x-0.5 bg-[#f5be18] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        }`}
      >
        {/* Sun details: subtle inner highlight */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#e5a805] to-[#fde047] transition-opacity duration-500 ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Moon craters */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Crater 1 (Top Left) */}
          <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-[#9ba5b5]/70" />
          {/* Crater 2 (Bottom Left) */}
          <span className="absolute left-1.5 bottom-1.5 h-2.5 w-2.5 rounded-full bg-[#9ba5b5]/70" />
          {/* Crater 3 (Right) */}
          <span className="absolute right-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#9ba5b5]/60" />
        </div>
      </div>
    </button>
  );
}
