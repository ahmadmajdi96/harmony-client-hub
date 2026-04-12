export const triggerBrowserDownload = (href: string, filename?: string) => {
  const anchor = document.createElement("a");
  anchor.href = href;
  if (filename) {
    anchor.download = filename;
  }
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  requestAnimationFrame(() => {
    anchor.remove();
  });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  triggerBrowserDownload(objectUrl, filename);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
};
