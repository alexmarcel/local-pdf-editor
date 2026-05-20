export interface LoadedPdf {
  originalPath: string;
  fileName: string;
  originalBytes: Uint8Array;
  pageCount: number;
}

export interface PageModel {
  id: string;
  originalPageIndex: number;
  position: number;
  rotationDelta: number;
  deleted: boolean;
}

export interface EditHistory {
  past: PageModel[][];
  present: PageModel[];
  future: PageModel[][];
}

export type PdfCompressionLevel = "none" | "standard" | "maximum";

export interface PdfFilePayload {
  path: string;
  file_name: string;
  bytes_base64: string;
}

export interface SaveResult {
  path: string;
}
