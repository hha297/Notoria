import type { JSONContent } from "@tiptap/react";
import {
  headingTagForLevel,
  normalizeTipTapHeadingLevels,
} from "@/lib/editor/heading-level";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function renderMarks(text: string, marks: JSONContent["marks"] | undefined): string {
  let html = escapeHtml(text);
  if (!marks?.length) return html;

  // Apply marks outermost-first so links wrap other marks stably.
  const ordered = [...marks].reverse();
  for (const mark of ordered) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "highlight":
        html = `<mark>${html}</mark>`;
        break;
      case "link": {
        const href =
          typeof mark.attrs?.href === "string" ? mark.attrs.href.trim() : "";
        if (!href) break;
        html = `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
        break;
      }
      default:
        break;
    }
  }

  return html;
}

function renderInline(nodes: JSONContent[] | undefined): string {
  if (!nodes?.length) return "";

  return nodes
    .map((node) => {
      if (node.type === "text") {
        return renderMarks(node.text ?? "", node.marks);
      }
      if (node.type === "hardBreak") {
        return "<br>";
      }
      if (node.type === "image") {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        if (!src) return "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
      }
      return renderInline(node.content);
    })
    .join("");
}

function renderListItemBody(item: JSONContent): string {
  return (item.content ?? []).map(renderBlock).join("");
}

function renderBulletOrOrderedList(
  nodes: JSONContent[] | undefined,
  ordered: boolean,
): string {
  const tag = ordered ? "ol" : "ul";
  const items = (nodes ?? [])
    .filter((item) => item.type === "listItem")
    .map((item) => `<li>${renderListItemBody(item)}</li>`)
    .join("");
  return items ? `<${tag}>${items}</${tag}>` : "";
}

function renderTaskList(nodes: JSONContent[] | undefined): string {
  const items = (nodes ?? [])
    .filter((item) => item.type === "taskItem" || item.type === "listItem")
    .map((item) => {
      const checked = Boolean(item.attrs?.checked);
      return `<li data-type="taskItem" data-checked="${checked ? "true" : "false"}"><label contenteditable="false"><input type="checkbox" disabled${checked ? " checked" : ""} /></label><div>${renderListItemBody(item)}</div></li>`;
    })
    .join("");
  return items ? `<ul data-type="taskList">${items}</ul>` : "";
}

function renderBlock(node: JSONContent): string {
  switch (node.type) {
    case "paragraph": {
      const inner = renderInline(node.content);
      return `<p>${inner || "<br>"}</p>`;
    }
    case "heading": {
      const tag = headingTagForLevel(node.attrs?.level);
      return `<${tag}>${renderInline(node.content)}</${tag}>`;
    }
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(renderBlock).join("")}</blockquote>`;
    case "codeBlock": {
      const language =
        typeof node.attrs?.language === "string" && node.attrs.language
          ? ` class="language-${escapeAttr(node.attrs.language)}"`
          : "";
      const code = escapeHtml(
        (node.content ?? [])
          .map((child) => (child.type === "text" ? (child.text ?? "") : ""))
          .join(""),
      );
      return `<pre><code${language}>${code}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "bulletList":
      return renderBulletOrOrderedList(node.content, false);
    case "orderedList":
      return renderBulletOrOrderedList(node.content, true);
    case "taskList":
      return renderTaskList(node.content);
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (!src) return "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
    }
    case "table": {
      const rows = (node.content ?? [])
        .map((row) => {
          if (row.type !== "tableRow") return "";
          const cells = (row.content ?? [])
            .map((cell) => {
              const cellTag = cell.type === "tableHeader" ? "th" : "td";
              const inner = (cell.content ?? []).map(renderBlock).join("");
              return `<${cellTag}>${inner}</${cellTag}>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><tbody>${rows}</tbody></table>`;
    }
    case "doc":
      return (node.content ?? []).map(renderBlock).join("");
    default:
      if (node.content?.length) {
        return node.content.map(renderBlock).join("");
      }
      return "";
  }
}

/**
 * Deterministic TipTap JSON → HTML for read-only Preview.
 * Heading tags always follow `attrs.level` (coerced to 1–6).
 */
export function tipTapDocumentToHtml(
  doc: JSONContent | null | undefined,
): string {
  const normalized = normalizeTipTapHeadingLevels(doc);
  return renderBlock(normalized);
}
