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
import { PDFDocument } from "pdf-lib";
import PageCard from "./PageCard";
import PagePreviewModal from "./PagePreviewModal";
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
import type { EditHistory, LoadedPdf, PdfCompressionLevel } from "./pdfTypes";
import { usePdfDocument } from "./usePdfDocument";
import { openPdfDialog, overwritePdf, readPdfFromPath, savePdfAs, unlockPdf } from "./electronApi";
import { loadPdfjs } from "./pdfjs";
import appIconUrl from "../app-icon.png";

interface PendingPasswordPdf {
  pdf: LoadedPdf;
  message: string;
}

class PdfPasswordRequiredError extends Error {
  pdf: LoadedPdf | null;
  promptMessage: string;

  constructor(pdf: LoadedPdf | null = null, promptMessage = "Enter the password to unlock this PDF.") {
    super("Password required.");
    this.name = "PdfPasswordRequiredError";
    this.pdf = pdf;
    this.promptMessage = promptMessage;
  }
}

export default function App() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [history, setHistory] = useState<EditHistory | null>(null);
  const [status, setStatus] = useState("Open a PDF to begin.");
  const [isBusy, setIsBusy] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<PdfCompressionLevel>("standard");
  const [pendingPasswordPdf, setPendingPasswordPdf] = useState<PendingPasswordPdf | null>(null);
  const [password, setPassword] = useState("");
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const { document: pdfDocument, error: previewError } = usePdfDocument(loadedPdf?.originalBytes ?? null);
  const pages = useMemo(() => (history ? visiblePages(history.present) : []), [history]);
  const previewPage = useMemo(
    () => pages.find((page) => page.id === previewPageId) ?? null,
    [pages, previewPageId]
  );
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

      const preparedPdf = await preparePdfForEditing(pdf);
      const pdfDoc = await loadPdfDocument(preparedPdf.originalBytes);
      const nextPdf = { ...preparedPdf, pageCount: pdfDoc.numPages };
      setLoadedPdf(nextPdf);
      setHistory(createHistory(createPages(pdfDoc.numPages)));
      setPendingPasswordPdf(null);
      setPassword("");
      setStatus(loadedStatus(nextPdf));
    } catch (err) {
      if (err instanceof PdfPasswordRequiredError) {
        if (err.pdf) {
          setPendingPasswordPdf({ pdf: err.pdf, message: err.promptMessage });
        }
        return;
      }

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
      return await exportEditedPdf(loadedPdf.originalBytes, history.present, { compressionLevel });
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

  async function handleUnlockWithPassword() {
    if (!pendingPasswordPdf) {
      return;
    }

    setIsBusy(true);
    setStatus("Unlocking PDF...");

    try {
      const unlocked = await unlockPdf(pendingPasswordPdf.pdf.originalPath, password);
      const pdfDoc = await loadPdfDocument(unlocked.originalBytes);
      const nextPdf = { ...unlocked, pageCount: pdfDoc.numPages };
      setLoadedPdf(nextPdf);
      setHistory(createHistory(createPages(pdfDoc.numPages)));
      setPendingPasswordPdf(null);
      setPassword("");
      setStatus(loadedStatus(nextPdf));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to unlock PDF.";
      setPendingPasswordPdf({
        pdf: pendingPasswordPdf.pdf,
        message: /incorrect password/i.test(message) ? "Incorrect password." : message
      });
      setStatus(message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleCancelPassword() {
    setPendingPasswordPdf(null);
    setPassword("");
    setLoadedPdf(null);
    setHistory(null);
    setStatus("Open a PDF to begin.");
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
          <label className="compression-control">
            <span>Compression</span>
            <select
              value={compressionLevel}
              disabled={!loadedPdf || isBusy}
              onChange={(event) => setCompressionLevel(event.target.value as PdfCompressionLevel)}
            >
              <option value="none">None</option>
              <option value="standard">Standard</option>
              <option value="maximum">Maximum</option>
            </select>
          </label>
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
                    onPreview={setPreviewPageId}
                    onRotate={(pageId, delta) => history && applyHistory(rotatePage(history, pageId, delta))}
                  />
                ))}
              </section>
            </SortableContext>
          </DndContext>
        </>
      )}

      {isBusy ? <div className="busy-indicator">Working...</div> : null}
      {pendingPasswordPdf ? (
        <div className="modal-backdrop" role="presentation">
          <form
            className="password-modal"
            onSubmit={(event) => {
              event.preventDefault();
              void handleUnlockWithPassword();
            }}
          >
            <h2>Password required</h2>
            <p>{pendingPasswordPdf.pdf.fileName}</p>
            <input
              autoFocus
              type="password"
              value={password}
              disabled={isBusy}
              onChange={(event) => setPassword(event.target.value)}
              aria-label="PDF password"
            />
            <span className="modal-message">{pendingPasswordPdf.message}</span>
            <div className="modal-actions">
              <button className="command-button" type="button" disabled={isBusy} onClick={handleCancelPassword}>
                Cancel
              </button>
              <button className="command-button primary" type="submit" disabled={isBusy}>
                Unlock
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {previewPage ? (
        <PagePreviewModal
          page={previewPage}
          displayIndex={pages.findIndex((page) => page.id === previewPage.id)}
          pdfDocument={pdfDocument}
          onClose={() => setPreviewPageId(null)}
        />
      ) : null}
      <div className="status-bar">
        <span>{status}</span>
        {loadedPdf ? <span>{loadedPdf.originalPath}</span> : null}
      </div>
    </main>
  );
}

async function preparePdfForEditing(pdf: LoadedPdf): Promise<LoadedPdf> {
  try {
    await loadPdfDocument(pdf.originalBytes);
  } catch (err) {
    if (isPasswordError(err)) {
      throw new PdfPasswordRequiredError(pdf);
    }

    throw err;
  }

  try {
    await PDFDocument.load(pdf.originalBytes);
    return { ...pdf, securityStatus: "none" };
  } catch (err) {
    if (isEncryptedPdfLibError(err)) {
      return unlockPdf(pdf.originalPath, "");
    }

    throw err;
  }
}

async function loadPdfDocument(bytes: Uint8Array) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: bytes.slice() });
  let passwordRequired = false;

  task.onPassword = (_updatePassword: (password: string) => void, _reason: unknown) => {
    passwordRequired = true;
    void task.destroy();
  };

  try {
    return await task.promise;
  } catch (err) {
    if (passwordRequired) {
      throw new PdfPasswordRequiredError();
    }

    throw err;
  }
}

function isPasswordError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  return /password/i.test(err.name) || /password/i.test(err.message);
}

function isEncryptedPdfLibError(err: unknown): boolean {
  return err instanceof Error && /encrypted/i.test(err.message);
}

function loadedStatus(pdf: LoadedPdf): string {
  const pageText = `${pdf.pageCount} page${pdf.pageCount === 1 ? "" : "s"}`;

  if (pdf.securityStatus === "password-unlocked") {
    return `${pdf.fileName} unlocked with password and loaded with ${pageText}.`;
  }

  if (pdf.securityStatus === "restrictions-removed") {
    return `${pdf.fileName} restrictions removed and loaded with ${pageText}.`;
  }

  return `${pdf.fileName} loaded with ${pageText}.`;
}

function editedFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith(".pdf")
    ? fileName.replace(/\.pdf$/i, "-edited.pdf")
    : `${fileName}-edited.pdf`;
}
