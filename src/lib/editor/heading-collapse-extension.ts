import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  getHeadingSectionRange,
  headingSectionHasContent,
} from "@/lib/editor/heading-collapse";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";

type CollapseMeta =
  | { type: "toggle"; pos: number }
  | { type: "expandAll" }
  | { type: "replace"; collapsed: Set<number> };

type CollapsePluginState = {
  collapsed: Set<number>;
  decorations: DecorationSet;
};

export const HeadingCollapsePluginKey = new PluginKey<CollapsePluginState>(
  "headingCollapse",
);

export type HeadingCollapseOptions = {
  expandLabel: string;
  collapseLabel: string;
  /** When set, collapse keys persist in sessionStorage for this browser tab. */
  storageKey: string | null;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingCollapse: {
      toggleHeadingCollapse: (pos: number) => ReturnType;
    };
  }
}

function headingStableKey(doc: PMNode, headingPos: number): string | null {
  const node = doc.nodeAt(headingPos);
  if (!node || node.type.name !== "heading") return null;
  let index = 0;
  let pos = 0;
  for (let i = 0; i < doc.childCount; i += 1) {
    const child = doc.child(i);
    if (pos === headingPos) {
      const level = coerceHeadingLevel(node.attrs.level);
      const text = node.textContent.slice(0, 120);
      return `${index}:${level}:${text}`;
    }
    if (child.type.name === "heading") index += 1;
    pos += child.nodeSize;
  }
  return null;
}

function collectHeadingPositions(doc: PMNode): number[] {
  const positions: number[] = [];
  let pos = 0;
  for (let i = 0; i < doc.childCount; i += 1) {
    const child = doc.child(i);
    if (child.type.name === "heading") positions.push(pos);
    pos += child.nodeSize;
  }
  return positions;
}

function loadCollapsedPositions(
  doc: PMNode,
  storageKey: string | null,
): Set<number> {
  if (!storageKey || typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return new Set();
    const keys = JSON.parse(raw) as unknown;
    if (!Array.isArray(keys)) return new Set();
    const keySet = new Set(keys.filter((k): k is string => typeof k === "string"));
    const collapsed = new Set<number>();
    for (const pos of collectHeadingPositions(doc)) {
      const key = headingStableKey(doc, pos);
      if (key && keySet.has(key)) collapsed.add(pos);
    }
    return collapsed;
  } catch {
    return new Set();
  }
}

function persistCollapsed(
  doc: PMNode,
  collapsed: Set<number>,
  storageKey: string | null,
) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (const pos of collapsed) {
      const key = headingStableKey(doc, pos);
      if (key) keys.push(key);
    }
    sessionStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    // Ignore quota / private mode failures.
  }
}

function remapCollapsed(tr: Transaction, collapsed: Set<number>): Set<number> {
  const next = new Set<number>();
  for (const pos of collapsed) {
    const mapped = tr.mapping.mapResult(pos, -1);
    if (mapped.deleted) continue;
    const node = tr.doc.nodeAt(mapped.pos);
    if (node?.type.name === "heading") next.add(mapped.pos);
  }
  return next;
}

function buildDecorations(
  doc: PMNode,
  collapsed: Set<number>,
  options: HeadingCollapseOptions,
): DecorationSet {
  const decorations: Decoration[] = [];

  // Hide section bodies for collapsed headings.
  for (const headingPos of collapsed) {
    const range = getHeadingSectionRange(doc, headingPos);
    if (!range || range.to <= range.from) continue;

    let pos = 0;
    for (let i = 0; i < doc.childCount; i += 1) {
      const child = doc.child(i);
      const childEnd = pos + child.nodeSize;
      if (pos >= range.from && childEnd <= range.to) {
        decorations.push(
          Decoration.node(pos, childEnd, {
            class: "heading-collapse-hidden",
          }),
        );
      }
      pos = childEnd;
    }
  }

  // Toggle controls on headings that own content.
  for (const headingPos of collectHeadingPositions(doc)) {
    if (!headingSectionHasContent(doc, headingPos)) continue;
    const isCollapsed = collapsed.has(headingPos);
    decorations.push(
      Decoration.widget(
        headingPos + 1,
        (view) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "heading-collapse-btn";
          button.contentEditable = "false";
          button.tabIndex = 0;
          button.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
          button.setAttribute(
            "aria-label",
            isCollapsed ? options.expandLabel : options.collapseLabel,
          );
          button.textContent = isCollapsed ? "▸" : "▾";
          button.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            view.dispatch(
              view.state.tr.setMeta(HeadingCollapsePluginKey, {
                type: "toggle",
                pos: headingPos,
              } satisfies CollapseMeta),
            );
          });
          return button;
        },
        {
          side: -1,
          ignoreSelection: true,
          key: `heading-collapse:${headingPos}:${isCollapsed ? "c" : "e"}`,
        },
      ),
    );
  }

  return DecorationSet.create(doc, decorations);
}

function createCollapsePlugin(
  options: HeadingCollapseOptions,
): Plugin<CollapsePluginState> {
  return new Plugin<CollapsePluginState>({
    key: HeadingCollapsePluginKey,
    state: {
      init(_, state) {
        const collapsed = loadCollapsedPositions(state.doc, options.storageKey);
        return {
          collapsed,
          decorations: buildDecorations(state.doc, collapsed, options),
        };
      },
      apply(tr, value, _oldState, newState) {
        let collapsed = tr.docChanged
          ? remapCollapsed(tr, value.collapsed)
          : value.collapsed;

        const meta = tr.getMeta(HeadingCollapsePluginKey) as
          | CollapseMeta
          | undefined;

        if (meta?.type === "toggle") {
          collapsed = new Set(collapsed);
          if (collapsed.has(meta.pos)) collapsed.delete(meta.pos);
          else collapsed.add(meta.pos);
        } else if (meta?.type === "expandAll") {
          collapsed = new Set();
        } else if (meta?.type === "replace") {
          collapsed = new Set(meta.collapsed);
        }

        const collapseChanged = Boolean(meta);
        if (!tr.docChanged && !collapseChanged) {
          return value;
        }

        if (collapseChanged) {
          persistCollapsed(newState.doc, collapsed, options.storageKey);
        }

        return {
          collapsed,
          decorations: buildDecorations(newState.doc, collapsed, options),
        };
      },
    },
    props: {
      decorations(state) {
        return HeadingCollapsePluginKey.getState(state)?.decorations;
      },
    },
  });
}

export const HeadingCollapse = Extension.create<HeadingCollapseOptions>({
  name: "headingCollapse",

  addOptions() {
    return {
      expandLabel: "Expand section",
      collapseLabel: "Collapse section",
      storageKey: null,
    };
  },

  addCommands() {
    return {
      toggleHeadingCollapse:
        (pos: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(
              tr.setMeta(HeadingCollapsePluginKey, {
                type: "toggle",
                pos,
              } satisfies CollapseMeta),
            );
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [createCollapsePlugin(this.options)];
  },
});
