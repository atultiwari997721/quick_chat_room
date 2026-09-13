"use client";

type LogoProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[24%] shadow-md transition-transform hover:scale-105 ${sizeClass} ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="logoBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
          <linearGradient id="logoBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="55%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="logoDropShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#1e1b4b" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Background rounded squircle */}
        <rect width="512" height="512" fill="url(#logoBgGrad)" />

        {/* Subtle glow border */}
        <rect
          x="6"
          y="6"
          width="500"
          height="500"
          rx="116"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeOpacity="0.3"
        />

        {/* Secondary decorative bubble */}
        <path
          d="M140 190 C140 135 185 90 240 90 L340 90 C395 90 440 135 440 190 C440 245 395 290 340 290 L330 290 L360 330 C365 336 360 345 352 342 L295 320 L240 320 C185 320 140 275 140 190 Z"
          fill="#ffffff"
          fillOpacity="0.22"
        />

        {/* Main Chat Bubble */}
        <g filter="url(#logoDropShadow)">
          <path
            d="M96 240 C96 170 152 114 222 114 L306 114 C376 114 432 170 432 240 C432 310 376 366 306 366 L230 366 L158 418 C146 426 130 418 130 404 L130 364 C110 344 96 305 96 240 Z"
            fill="url(#logoBubbleGrad)"
          />
        </g>

        {/* Dynamic Lightning Bolt */}
        <path
          d="M278 152 L188 274 C184 280 188 288 196 288 L252 288 L232 356 C229 366 242 372 248 364 L338 244 C342 238 338 230 330 230 L274 230 L294 160 C297 150 284 144 278 152 Z"
          fill="url(#logoBoltGrad)"
        />

        {/* Sparkles */}
        <circle cx="360" cy="170" r="8" fill="#ffffff" fillOpacity="0.85" />
        <circle cx="140" cy="150" r="6" fill="#ffffff" fillOpacity="0.65" />
      </svg>
    </div>
  );
}
