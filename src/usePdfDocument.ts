import { useEffect, useState } from "react";
import { loadPdfjs, type PDFDocumentProxy } from "./pdfjs";

export function usePdfDocument(bytes: Uint8Array | null, password?: string) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDocument(null);
      setError(null);

      if (!bytes) {
        return;
      }

      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({ data: bytes.slice(), password });
        const loaded = await task.promise;

        if (!cancelled) {
          setDocument(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load PDF.");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [bytes, password]);

  return { document, error };
}
