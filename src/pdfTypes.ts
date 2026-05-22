export interface LoadedPdf {
  originalPath: string;
  fileName: string;
  originalBytes: Uint8Array;
  pageCount: number;
  securityStatus?: PdfSecurityStatus;
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

export type PdfSecurityStatus = "none" | "password-unlocked" | "restrictions-removed";

export interface PdfFilePayload {
  path: string;
  file_name: string;
  bytes_base64: string;
  security_status?: PdfSecurityStatus;
}

export interface SaveResult {
  path: string;
}
