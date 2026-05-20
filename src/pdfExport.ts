import { PDFDocument, degrees } from "pdf-lib";
import { visiblePages } from "./pageOps";
import type { PageModel } from "./pdfTypes";

export async function exportEditedPdf(
  originalBytes: Uint8Array,
  pages: PageModel[]
): Promise<Uint8Array> {
  const source = await PDFDocument.load(originalBytes);
  const output = await PDFDocument.create();
  const visible = visiblePages(pages);

  for (const page of visible) {
    const [copiedPage] = await output.copyPages(source, [page.originalPageIndex]);
    const currentRotation = copiedPage.getRotation().angle;
    copiedPage.setRotation(degrees((currentRotation + page.rotationDelta) % 360));
    output.addPage(copiedPage);
  }

  return output.save();
}
