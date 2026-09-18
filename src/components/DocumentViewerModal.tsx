'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { downloadFileBlob, getFileBlobUrl, shareFileIfSupported } from '@/lib/downloadHelper';

interface DocumentViewerModalProps {
  src: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  onClose: () => void;
}

export default function DocumentViewerModal({
  src,
  fileName = 'document',
  fileType = '',
  fileSize,
  onClose,
}: DocumentViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Determine file format
  const isPdf = useMemo(() => {
    return (
      fileType.toLowerCase().includes('pdf') ||
      fileName.toLowerCase().endsWith('.pdf') ||
      src.startsWith('data:application/pdf')
    );
  }, [fileType, fileName, src]);

  const isText = useMemo(() => {
    return (
      fileType.startsWith('text/') ||
      /\.(txt|md|json|csv|log|js|ts|py|html|css|xml|sql|env)$/i.test(fileName)
    );
  }, [fileType, fileName]);

  const fileExt = useMemo(() => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE';
  }, [fileName]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true);
    }
  }, []);

  // Prepare Blob URL and load text preview if applicable
  useEffect(() => {
    const { blobUrl: url, revoke } = getFileBlobUrl(src);
    setBlobUrl(url);
    setLoading(false);

    if (isText) {
      if (src.startsWith('data:')) {
        try {
          const parts = src.split(',');
          const text = parts[0].includes(';base64')
            ? atob(parts[1])
            : decodeURIComponent(parts[1]);
          setTextContent(text.slice(0, 50000)); // cap at 50KB for fast render
        } catch {
          setTextContent('Could not parse text document.');
        }
      } else {
        fetch(src)
          .then((res) => res.text())
          .then((txt) => setTextContent(txt.slice(0, 50000)))
          .catch(() => setTextContent('Could not load text document.'));
      }
    }

    return () => {
      revoke();
    };
  }, [src, isText]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    setDownloading(true);
    await downloadFileBlob(src, fileName);
    setDownloading(false);
  };

  const handleShare = async () => {
    await shareFileIfSupported(src, fileName, fileType);
  };

  const formattedSize = useMemo(() => {
    if (!fileSize) return null;
    if (fileSize < 1024) return `${fileSize} B`;
    if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  }, [fileSize]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[92vh] sm:h-[88vh] bg-zinc-900 border border-zinc-700/70 rounded-2xl shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/90 border-b border-zinc-700/80 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400 font-bold text-xs border border-indigo-500/30">
              {fileExt}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate text-zinc-100 max-w-[180px] sm:max-w-md">
                {fileName}
              </h2>
              {formattedSize && (
                <p className="text-[11px] text-zinc-400">{formattedSize}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {canShare && (
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-700/70 hover:bg-zinc-600 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
                title="Share Document"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-zinc-700/70 hover:bg-zinc-600 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
                title="Open in new window"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>New Tab</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title="Download File"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{downloading ? 'Saving...' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors ml-1"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 w-full h-full overflow-hidden bg-zinc-950 flex flex-col items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Preparing document...</p>
            </div>
          ) : isPdf ? (
            /* PDF In-App Previewer with fallback notice for mobile */
            <div className="w-full h-full flex flex-col relative">
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0 bg-white"
                title={fileName}
              />
              {/* Mobile quick-helper bar if iframe preview is constrained */}
              <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur border border-zinc-700 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[11px] text-zinc-300">
                <span>PDF not showing clearly?</span>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="font-bold text-indigo-400 hover:underline"
                >
                  Tap to Download
                </button>
              </div>
            </div>
          ) : isText && textContent !== null ? (
            /* Text / Code File Previewer */
            <div className="w-full h-full p-4 overflow-auto">
              <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap break-words selection:bg-indigo-500/40">
                {textContent}
              </pre>
            </div>
          ) : (
            /* General Document Preview Card (Word, Excel, ZIP, etc.) */
            <div className="p-6 sm:p-10 max-w-md w-full flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-extrabold text-2xl shadow-inner mb-4">
                {fileExt}
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1 break-words max-w-full">
                {fileName}
              </h3>
              {formattedSize && (
                <p className="text-xs text-zinc-400 mb-4">{formattedSize}</p>
              )}
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Direct in-browser preview is not available for this file type. You can download the file to your device or share it directly with apps like WhatsApp, Google Drive, or Office.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloading ? 'Downloading...' : 'Download Document'}
                </button>
                {canShare && (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl border border-zinc-700 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
