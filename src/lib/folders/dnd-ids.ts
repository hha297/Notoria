export const ROOT_DROP_ID = "crumb:root";

export function folderDragId(id: string) {
  return `folder:${id}`;
}

export function folderDropId(id: string) {
  return `drop-folder:${id}`;
}

export function itemDragId(id: string) {
  return `item:${id}`;
}

export function crumbDropId(id: string) {
  return `crumb:${id}`;
}

export function parseDragId(id: string): {
  kind: "folder" | "item";
  id: string;
} | null {
  if (id.startsWith("folder:")) {
    return { kind: "folder", id: id.slice("folder:".length) };
  }
  if (id.startsWith("item:")) {
    return { kind: "item", id: id.slice("item:".length) };
  }
  return null;
}

export function parseDropId(id: string): string | null | undefined {
  if (id === ROOT_DROP_ID) return null;
  if (id.startsWith("drop-folder:")) return id.slice("drop-folder:".length);
  if (id.startsWith("crumb:")) {
    const crumbId = id.slice("crumb:".length);
    return crumbId === "root" ? null : crumbId;
  }
  return undefined;
}
