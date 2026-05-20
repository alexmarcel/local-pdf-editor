import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from "@dnd-kit/sortable";
import { FileDown, FileInput, Save, Undo2, Redo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import PageCard from "./PageCard";
import { exportEditedPdf } from "./pdfExport";
import {
  createHistory,
  createPages,
  deletePage,
  hasChanges,
  redo,
  reorderPage,
  rotatePage,
  undo,
  visiblePages
} from "./pageOps";
import type { EditHistory, LoadedPdf } from "./pdfTypes";
import { usePdfDocument } from "./usePdfDocument";
import { openPdfDialog, overwritePdf, readPdfFromPath, savePdfAs } from "./electronApi";
import { loadPdfjs } from "./pdfjs";
import appIconUrl from "/meme.jpg";

export default function App() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [history, setHistory] = useState<EditHistory | null>(null);
  const [status, setStatus] = useState("Open a PDF to begin.");
  const [isBusy, setIsBusy] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const { document: pdfDocument, error: previewError } = usePdfDocument(loadedPdf?.originalBytes ?? null);
  const pages = useMemo(() => (history ? visiblePages(history.present) : []), [history]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPdf = useCallback(async (loader: () => Promise<LoadedPdf | null>) => {
    setIsBusy(true);
    setStatus("Loading PDF...");

    try {
      const pdf = await loader();

      if (!pdf) {
        setStatus("Open a PDF to begin.");
        return;
      }

      const pdfjs = await loadPdfjs();
      const pdfDoc = await pdfjs.getDocument({ data: pdf.originalBytes.slice() }).promise;
      const nextPdf = { ...pdf, pageCount: pdfDoc.numPages };
      setLoadedPdf(nextPdf);
      setHistory(createHistory(createPages(pdfDoc.numPages)));
      setStatus(`${nextPdf.fileName} loaded with ${pdfDoc.numPages} page${pdfDoc.numPages === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to load PDF.");
    } finally {
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    if (previewError) {
      setStatus(previewError);
    }
  }, [previewError]);

  function applyHistory(nextHistory: EditHistory) {
    setHistory(nextHistory);
    setStatus("Unsaved changes.");
  }

  function onDragEnd(event: DragEndEvent) {
    if (!history || !event.over) {
      return;
    }

    applyHistory(reorderPage(history, String(event.active.id), String(event.over.id)));
  }

  async function buildEditedPdf(): Promise<Uint8Array | null> {
    if (!loadedPdf || !history) {
      return null;
    }

    if (visiblePages(history.present).length === 0) {
      setStatus("A PDF must keep at least one page.");
      return null;
    }

    setIsBusy(true);
    setStatus("Preparing edited PDF...");

    try {
      return await exportEditedPdf(loadedPdf.originalBytes, history.present);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to export PDF.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveAs() {
    if (!loadedPdf) {
      return;
    }

    const bytes = await buildEditedPdf();

    if (!bytes) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await savePdfAs(bytes, editedFileName(loadedPdf.fileName));
      setStatus(result ? `Saved to ${result.path}.` : "Save canceled.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOverwrite() {
    if (!loadedPdf) {
      return;
    }

    const confirmed = window.confirm(`Overwrite the original file?\n\n${loadedPdf.originalPath}`);

    if (!confirmed) {
      return;
    }

    const bytes = await buildEditedPdf();

    if (!bytes) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await overwritePdf(loadedPdf.originalPath, bytes);
      setStatus(`Saved to ${result.path}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDropActive(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDropActive(false);

    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.name.toLowerCase().endsWith(".pdf")
    ) as (File & { path?: string }) | undefined;
    const path = file?.path;

    if (!path) {
      setStatus("Drop a local PDF file.");
      return;
    }

    void loadPdf(() => readPdfFromPath(path));
  }

  return (
    <main
      className={`app-shell${isDropActive ? " drop-active" : ""}`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={handleDrop}
    >
      <header className="topbar">
        <div className="brand-banner">
          <img className="brand-icon" src={appIconUrl} alt="JumiPDF icon" />
          <div>
            <h1>JumiPDF</h1>
            <p>{loadedPdf ? loadedPdf.fileName : "Private page edits on your desktop"}</p>
          </div>
        </div>
        <div className="toolbar">
          <button className="command-button" disabled={isBusy} onClick={() => void loadPdf(openPdfDialog)}>
            <FileInput size={18} />
            Open
          </button>
          <button
            className="icon-button"
            title="Undo"
            disabled={!history?.past.length || isBusy}
            onClick={() => history && setHistory(undo(history))}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            title="Redo"
            disabled={!history?.future.length || isBusy}
            onClick={() => history && setHistory(redo(history))}
          >
            <Redo2 size={18} />
          </button>
          <button className="command-button" disabled={!loadedPdf || isBusy} onClick={() => void handleOverwrite()}>
            <Save size={18} />
            Save
          </button>
          <button className="command-button primary" disabled={!loadedPdf || isBusy} onClick={() => void handleSaveAs()}>
            <FileDown size={18} />
            Save As
          </button>
        </div>
      </header>

      {!loadedPdf ? (
        <section className="empty-state">
          <div className="drop-target">
            <FileInput size={40} />
            <h2>Drop a PDF here</h2>
            <button className="command-button primary" disabled={isBusy} onClick={() => void loadPdf(openPdfDialog)}>
              Open PDF
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="summary-strip">
            <span>{pages.length} visible page{pages.length === 1 ? "" : "s"}</span>
            <span>{hasChanges(history!) ? "Unsaved edits" : "No edits yet"}</span>
            <span>{status}</span>
          </section>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pages.map((page) => page.id)} strategy={rectSortingStrategy}>
              <section className="page-grid">
                {pages.map((page, index) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    displayIndex={index}
                    pdfDocument={pdfDocument}
                    onDelete={(pageId) => history && applyHistory(deletePage(history, pageId))}
                    onRotate={(pageId, delta) => history && applyHistory(rotatePage(history, pageId, delta))}
                  />
                ))}
              </section>
            </SortableContext>
          </DndContext>
        </>
      )}

      {isBusy ? <div className="busy-indicator">Working...</div> : null}
      <div className="status-bar">
        <span>{status}</span>
        {loadedPdf ? <span>{loadedPdf.originalPath}</span> : null}
      </div>
    </main>
  );
}

function editedFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith(".pdf")
    ? fileName.replace(/\.pdf$/i, "-edited.pdf")
    : `${fileName}-edited.pdf`;
}
