import type { DiffSide, FileLines } from "./diff";

const CONTENT_CELL_SELECTOR =
  ".diff-line-content, .diff-line-old-content, .diff-line-new-content";
const CONTENT_TEXT_SELECTOR = ".diff-line-syntax-raw, .diff-line-content-raw";

export function getSelectedDiffText(
  selection: Selection,
  container: HTMLElement,
  fileLines: FileLines
): string | undefined {
  if (selection.isCollapsed || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  const selectedLines = [
    ...container.querySelectorAll<HTMLElement>(CONTENT_CELL_SELECTOR),
  ]
    .filter((cell) => range.intersectsNode(cell) && isSelectable(cell))
    .map((cell) => getSelectedLine(cell, range))
    .filter((line) => line !== undefined);

  if (selectedLines.length === 0) return;

  return resolveSelectedText(selectedLines, fileLines);
}

export function resolveSelectedText(
  selectedLines: SelectedLine[],
  fileLines: FileLines
) {
  const hasNewLines = selectedLines.some(({ side }) => side === "new");
  const lines = hasNewLines
    ? selectedLines.filter(({ isDeletion }) => !isDeletion)
    : selectedLines;

  return lines
    .map(
      ({ lineNumber, partialText, side }) =>
        partialText ?? fileLines[side][lineNumber - 1] ?? ""
    )
    .join("\n");
}

function isSelectable(cell: HTMLElement) {
  return getComputedStyle(cell).userSelect !== "none";
}

function getContentCellSide(cell: HTMLElement | null): DiffSide | undefined {
  const side = cell?.dataset["side"];
  return side === "old" || side === "new" ? side : undefined;
}

function getSelectedLine(
  cell: HTMLElement,
  range: Range
): SelectedLine | undefined {
  const row = cell.closest("tr");
  if (!row) return;

  const location = getLineLocation(cell, row);
  if (!location) return;

  const partialText = getPartialText(cell, range);

  return partialText === undefined ? location : { ...location, partialText };
}

function getLineLocation(
  cell: HTMLElement,
  row: HTMLTableRowElement
): Omit<SelectedLine, "partialText"> | undefined {
  const splitSide = getContentCellSide(cell);

  if (splitSide) {
    const lineNumber = Number(
      row
        .querySelector(`.diff-line-${splitSide}-num [data-line-num]`)
        ?.getAttribute("data-line-num")
    );
    const isDeletion =
      cell.querySelector(".diff-line-content-operator")?.textContent === "-";

    return lineNumber ? { isDeletion, lineNumber, side: splitSide } : undefined;
  }

  const isDeletion =
    cell.querySelector(".diff-line-content-operator")?.textContent === "-";
  const side = isDeletion ? "old" : "new";
  const lineNumber = Number(
    row
      .querySelector(`[data-line-${side}-num]`)
      ?.getAttribute(`data-line-${side}-num`)
  );

  return lineNumber ? { isDeletion, lineNumber, side } : undefined;
}

function getPartialText(cell: HTMLElement, range: Range) {
  const textElement = cell.querySelector(CONTENT_TEXT_SELECTOR);
  if (!textElement) return;

  const startsInside = textElement.contains(range.startContainer);
  const endsInside = textElement.contains(range.endContainer);
  if (!startsInside && !endsInside) return;

  const partialRange = document.createRange();
  partialRange.selectNodeContents(textElement);
  if (startsInside)
    partialRange.setStart(range.startContainer, range.startOffset);
  if (endsInside) partialRange.setEnd(range.endContainer, range.endOffset);

  return partialRange.toString();
}

export interface SelectedLine {
  isDeletion: boolean;
  lineNumber: number;
  partialText?: string;
  side: DiffSide;
}
