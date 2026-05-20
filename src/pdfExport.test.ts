import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { createHistory, createPages, deletePage, reorderPage, rotatePage } from "./pageOps";
import { exportEditedPdf } from "./pdfExport";

async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
  doc.addPage([210, 310]);
  doc.addPage([220, 320]);
  doc.getPage(2).setRotation(degrees(90));
  return doc.save();
}

describe("PDF export", () => {
  it("omits deleted pages and applies rotations", async () => {
    const bytes = await createSamplePdf();
    const history = createHistory(createPages(3));
    const reordered = reorderPage(history, "page-3", "page-1");
    const deleted = deletePage(reordered, "page-2");
    const rotated = rotatePage(deleted, "page-1", 90);

    const editedBytes = await exportEditedPdf(bytes, rotated.present);
    const edited = await PDFDocument.load(editedBytes);

    expect(edited.getPageCount()).toBe(2);
    expect(edited.getPage(0).getRotation().angle).toBe(90);
    expect(edited.getPage(1).getRotation().angle).toBe(90);
  });
});
