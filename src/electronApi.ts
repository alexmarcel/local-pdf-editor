import { base64ToUint8Array, uint8ArrayToBase64 } from "./bytes";
import type { LoadedPdf, PdfFilePayload, SaveResult } from "./pdfTypes";

declare global {
  interface Window {
    pdfApi?: {
      openPdf: () => Promise<PdfFilePayload | null>;
      readPdfFromPath: (path: string) => Promise<PdfFilePayload>;
      unlockPdf: (path: string, password: string) => Promise<PdfFilePayload>;
      savePdfAs: (bytesBase64: string, suggestedName: string) => Promise<SaveResult | null>;
      overwritePdf: (path: string, bytesBase64: string) => Promise<SaveResult>;
    };
  }
}

function getPdfApi() {
  if (!window.pdfApi) {
    throw new Error("Desktop PDF API is unavailable. Run the app with Electron.");
  }

  return window.pdfApi;
}

function payloadToLoadedPdf(payload: PdfFilePayload): LoadedPdf {
  return {
    originalPath: payload.path,
    fileName: payload.file_name,
    originalBytes: base64ToUint8Array(payload.bytes_base64),
    pageCount: 0,
    securityStatus: payload.security_status ?? "none"
  };
}

export async function openPdfDialog(): Promise<LoadedPdf | null> {
  const payload = await getPdfApi().openPdf();
  return payload ? payloadToLoadedPdf(payload) : null;
}

export async function readPdfFromPath(path: string): Promise<LoadedPdf> {
  const payload = await getPdfApi().readPdfFromPath(path);
  return payloadToLoadedPdf(payload);
}

export async function unlockPdf(path: string, password: string): Promise<LoadedPdf> {
  const payload = await getPdfApi().unlockPdf(path, password);
  return {
    ...payloadToLoadedPdf(payload),
    securityStatus: password ? "password-unlocked" : "restrictions-removed"
  };
}

export async function savePdfAs(bytes: Uint8Array, suggestedName: string): Promise<SaveResult | null> {
  return getPdfApi().savePdfAs(uint8ArrayToBase64(bytes), suggestedName);
}

export async function overwritePdf(path: string, bytes: Uint8Array): Promise<SaveResult> {
  return getPdfApi().overwritePdf(path, uint8ArrayToBase64(bytes));
}
