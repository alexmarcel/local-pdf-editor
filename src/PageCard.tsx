import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, RotateCcw, RotateCw, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "./pdfjs";
import type { PageModel } from "./pdfTypes";

interface PageCardProps {
  page: PageModel;
  displayIndex: number;
  pdfDocument: PDFDocumentProxy | null;
  onDelete: (pageId: string) => void;
  onPreview: (pageId: string) => void;
  onRotate: (pageId: string, delta: number) => void;
}

export default function PageCard({
  page,
  displayIndex,
  pdfDocument,
  onDelete,
  onPreview,
  onRotate
}: PageCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id
  });

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) {
        return;
      }

      try {
        setRenderError(null);
        const pdfPage = await pdfDocument.getPage(page.originalPageIndex + 1);
        const viewport = pdfPage.getViewport({ scale: 0.36, rotation: page.rotationDelta });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : "Preview failed.");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page.originalPageIndex, page.rotationDelta]);

  return (
    <article
      className={`page-card${isDragging ? " is-dragging" : ""}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
    >
      <div className="page-preview">
        <canvas ref={canvasRef} className={renderError ? "is-hidden" : ""} />
        {!renderError ? (
          <button className="preview-button" title="Preview page" onClick={() => onPreview(page.id)}>
            <Search size={22} />
          </button>
        ) : null}
        {renderError ? <span className="preview-error">{renderError}</span> : null}
      </div>
      <div className="page-meta">
        <button className="icon-button drag-handle" title="Reorder page" {...attributes} {...listeners}>
          <GripVertical size={18} />
        </button>
        <span>Page {displayIndex + 1}</span>
        <div className="page-actions">
          <button className="icon-button" title="Rotate left" onClick={() => onRotate(page.id, -90)}>
            <RotateCcw size={17} />
          </button>
          <button className="icon-button" title="Rotate right" onClick={() => onRotate(page.id, 90)}>
            <RotateCw size={17} />
          </button>
          <button className="icon-button danger" title="Delete page" onClick={() => onDelete(page.id)}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
