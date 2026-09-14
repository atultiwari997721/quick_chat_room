'use client';

import React, { useEffect } from 'react';

interface MediaViewerModalProps {
  src: string;
  alt?: string;
  fileName?: string;
  onClose: () => void;
}

export default function MediaViewerModal({
  src,
  alt = 'Image preview',
  fileName = 'download',
  onClose,
}: MediaViewerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top actions bar */}
        <div className="absolute top-[-44px] right-0 flex items-center gap-2 text-white">
          <a
            href={src}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            title="Download full image"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </a>
          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg transition-colors shadow-sm"
            aria-label="Close image viewer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Image Display */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[82vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-neutral-800/60 select-none"
        />

        {fileName && (
          <p className="mt-3 text-xs text-neutral-400 truncate max-w-xs sm:max-w-md text-center">
            {fileName}
          </p>
        )}
      </div>
    </div>
  );
}
