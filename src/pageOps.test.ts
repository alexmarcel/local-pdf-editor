import { describe, expect, it } from "vitest";
import {
  createHistory,
  createPages,
  deletePage,
  redo,
  reorderPage,
  rotatePage,
  undo,
  visiblePages
} from "./pageOps";

describe("page operations", () => {
  it("deletes pages without removing them from history state", () => {
    const history = createHistory(createPages(3));
    const next = deletePage(history, "page-2");

    expect(visiblePages(next.present).map((page) => page.id)).toEqual(["page-1", "page-3"]);
    expect(next.present).toHaveLength(3);
  });

  it("reorders pages", () => {
    const history = createHistory(createPages(3));
    const next = reorderPage(history, "page-3", "page-1");

    expect(visiblePages(next.present).map((page) => page.id)).toEqual([
      "page-3",
      "page-1",
      "page-2"
    ]);
  });

  it("rotates pages in normalized 90 degree steps", () => {
    const history = createHistory(createPages(1));
    const rotated = rotatePage(history, "page-1", -90);

    expect(rotated.present[0].rotationDelta).toBe(270);
  });

  it("supports undo and redo", () => {
    const history = createHistory(createPages(2));
    const deleted = deletePage(history, "page-1");
    const undone = undo(deleted);
    const redone = redo(undone);

    expect(visiblePages(undone.present).map((page) => page.id)).toEqual(["page-1", "page-2"]);
    expect(visiblePages(redone.present).map((page) => page.id)).toEqual(["page-2"]);
  });
});
