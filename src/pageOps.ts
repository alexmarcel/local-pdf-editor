import type { EditHistory, PageModel } from "./pdfTypes";

function clonePages(pages: PageModel[]): PageModel[] {
  return pages.map((page) => ({ ...page }));
}

function normalizePositions(pages: PageModel[]): PageModel[] {
  return pages.map((page, index) => ({ ...page, position: index }));
}

function commit(history: EditHistory, nextPages: PageModel[]): EditHistory {
  return {
    past: [...history.past, clonePages(history.present)],
    present: normalizePositions(nextPages),
    future: []
  };
}

export function createPages(pageCount: number): PageModel[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `page-${index + 1}`,
    originalPageIndex: index,
    position: index,
    rotationDelta: 0,
    deleted: false
  }));
}

export function createHistory(pages: PageModel[]): EditHistory {
  return {
    past: [],
    present: normalizePositions(clonePages(pages)),
    future: []
  };
}

export function visiblePages(pages: PageModel[]): PageModel[] {
  return pages.filter((page) => !page.deleted).sort((a, b) => a.position - b.position);
}

export function deletePage(history: EditHistory, pageId: string): EditHistory {
  const nextPages = history.present.map((page) =>
    page.id === pageId ? { ...page, deleted: true } : page
  );

  return commit(history, normalizePositions(nextPages));
}

export function rotatePage(history: EditHistory, pageId: string, delta: number): EditHistory {
  const nextPages = history.present.map((page) => {
    if (page.id !== pageId) {
      return page;
    }

    return {
      ...page,
      rotationDelta: (((page.rotationDelta + delta) % 360) + 360) % 360
    };
  });

  return commit(history, nextPages);
}

export function reorderPage(history: EditHistory, activeId: string, overId: string): EditHistory {
  if (activeId === overId) {
    return history;
  }

  const activeIndex = history.present.findIndex((page) => page.id === activeId);
  const overIndex = history.present.findIndex((page) => page.id === overId);

  if (activeIndex < 0 || overIndex < 0) {
    return history;
  }

  const nextPages = clonePages(history.present);
  const [movedPage] = nextPages.splice(activeIndex, 1);
  nextPages.splice(overIndex, 0, movedPage);

  return commit(history, nextPages);
}

export function undo(history: EditHistory): EditHistory {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: clonePages(previous),
    future: [clonePages(history.present), ...history.future]
  };
}

export function redo(history: EditHistory): EditHistory {
  const next = history.future[0];

  if (!next) {
    return history;
  }

  return {
    past: [...history.past, clonePages(history.present)],
    present: clonePages(next),
    future: history.future.slice(1)
  };
}

export function hasChanges(history: EditHistory): boolean {
  return history.past.length > 0;
}
