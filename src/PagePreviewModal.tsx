import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "./pdfjs";
import type { PageModel } from "./pdfTypes";

interface PagePreviewModalProps {
  page: PageModel;
  displayIndex: number;
  pdfDocument: PDFDocumentProxy | null;
  onClose: () => void;
}

export default function PagePreviewModal({
  page,
  displayIndex,
  pdfDocument,
  onClose
}: PagePreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) {
        setIsRendering(false);
        return;
      }

      try {
        setIsRendering(true);
        setRenderError(null);
        const pdfPage = await pdfDocument.getPage(page.originalPageIndex + 1);
        const baseViewport = pdfPage.getViewport({ scale: 1, rotation: page.rotationDelta });
        const maxWidth = Math.max(320, Math.min(window.innerWidth * 0.82, 900));
        const maxHeight = Math.max(360, window.innerHeight * 0.72);
        const scale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height, 1.65);
        const viewport = pdfPage.getViewport({ scale, rotation: page.rotationDelta });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context || cancelled) {
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : "Preview failed.");
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page.originalPageIndex, page.rotationDelta]);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="page-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Page ${displayIndex + 1} preview`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="preview-modal-header">
          <h2>Page {displayIndex + 1}</h2>
          <button className="icon-button" title="Close preview" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="large-page-preview">
          <canvas ref={canvasRef} className={renderError || isRendering ? "is-hidden" : ""} />
          {isRendering ? <span className="preview-loading">Rendering...</span> : null}
          {renderError ? <span className="preview-error">{renderError}</span> : null}
        </div>
      </section>
    </div>
  );
}
