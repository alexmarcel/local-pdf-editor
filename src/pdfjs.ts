import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

let pdfjsPromise: Promise<typeof PdfJs> | null = null;

export type PDFDocumentProxy = PdfJs.PDFDocumentProxy;

export async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    });
  }

  return pdfjsPromise;
}
