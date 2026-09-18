/**
 * Robust cross-device file download and Blob handling helper.
 * Solves mobile Safari / Chrome blocks on top-level data URLs and ensures
 * proper file saving on iOS, Android, and desktop browsers.
 */

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const match = parts[0].match(/:(.*?);/);
  const mime = match ? match[1] : "application/octet-stream";
  const isBase64 = parts[0].includes(";base64");

  if (isBase64) {
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } else {
    const decoded = decodeURIComponent(parts[1]);
    return new Blob([decoded], { type: mime });
  }
}

export function getFileBlobUrl(fileUrl: string): { blobUrl: string; revoke: () => void } {
  if (fileUrl.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(fileUrl);
      const url = URL.createObjectURL(blob);
      return { blobUrl: url, revoke: () => URL.revokeObjectURL(url) };
    } catch {
      return { blobUrl: fileUrl, revoke: () => {} };
    }
  }
  return { blobUrl: fileUrl, revoke: () => {} };
}

export async function downloadFileBlob(fileUrl: string, fileName: string): Promise<boolean> {
  try {
    let blobUrl: string;
    let shouldRevoke = false;

    if (fileUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(fileUrl);
      blobUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    } else if (fileUrl.startsWith("blob:")) {
      blobUrl = fileUrl;
    } else {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "download";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
    return true;
  } catch (err) {
    console.error("Failed to download file:", err);
    window.open(fileUrl, "_blank");
    return false;
  }
}

export async function shareFileIfSupported(fileUrl: string, fileName: string, fileType?: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.canShare) {
    try {
      let blob: Blob;
      if (fileUrl.startsWith("data:")) {
        blob = dataUrlToBlob(fileUrl);
      } else {
        const res = await fetch(fileUrl);
        blob = await res.blob();
      }
      const file = new File([blob], fileName, { type: fileType || blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return true;
      }
    } catch {
      // User cancelled or share failed
    }
  }
  return false;
}
