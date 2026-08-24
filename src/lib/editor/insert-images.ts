import type { Editor } from "@tiptap/react";

export function replaceEditorImageSrc(
  editor: Editor,
  fromSrc: string,
  toSrc: string,
) {
  const { tr, doc } = editor.state;
  let changed = false;

  doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === fromSrc) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: toSrc });
      changed = true;
    }
  });

  if (changed) {
    editor.view.dispatch(tr);
  }
}

export function removeEditorImagesBySrc(editor: Editor, src: string) {
  const { tr, doc } = editor.state;
  const ranges: Array<{ from: number; to: number }> = [];

  doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === src) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
  });

  for (const range of [...ranges].reverse()) {
    tr.delete(range.from, range.to);
  }

  if (ranges.length > 0) {
    editor.view.dispatch(tr);
  }
}
