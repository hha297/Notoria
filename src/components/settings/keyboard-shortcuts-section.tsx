"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  APP_SHORTCUTS,
  BROWSER_RESERVED_SHORTCUTS,
  RESERVED_SHORTCUT_GROUPS,
  addShortcutChord,
  actionHasBuiltInDefault,
  areShortcutsEnabled,
  capturePreviewFromKeyboardEvent,
  chordEquals,
  chordFromKeyboardEvent,
  findShortcutConflict,
  formatCapturePreview,
  formatChord,
  formatReservedShortcut,
  getAllShortcutBindings,
  getShortcutDefinition,
  isBlockedChord,
  listShortcutBindings,
  removeShortcutChord,
  resetAllShortcuts,
  resetShortcut,
  setShortcutChord,
  setShortcutsEnabled,
  isShortcutCustomized,
  subscribeShortcutsChanged,
  type ChordCapturePreview,
  type ShortcutBindingEntry,
  type ShortcutChord,
  type ShortcutConflict,
  type ShortcutId,
} from "@/lib/preferences/shortcuts";
import { cn } from "@/lib/utils";

type ShortcutEditorState =
  | { mode: "edit"; id: ShortcutId; index: number }
  | { mode: "add"; id: ShortcutId | null };

function SettingsPanel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-panel" aria-labelledby={id}>
      <header className="settings-panel-head">
        <h2 id={id} className="settings-panel-title">
          {title}
        </h2>
        <p className="settings-panel-lede">{description}</p>
      </header>
      <div className="settings-panel-body settings-prefs">{children}</div>
    </section>
  );
}

export function KeyboardShortcutsSection() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [platform, setPlatform] = useState<"mac" | "other">("other");
  const [enabled, setEnabled] = useState(true);
  const [bindings, setBindings] = useState(() => getAllShortcutBindings());
  const [editor, setEditor] = useState<ShortcutEditorState | null>(null);
  const [draft, setDraft] = useState<ShortcutChord | null>(null);
  const [preview, setPreview] = useState<ChordCapturePreview | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);

  const sync = useCallback(() => {
    setBindings(getAllShortcutBindings());
    setEnabled(areShortcutsEnabled());
  }, []);

  useEffect(() => {
    setPlatform(/mac/i.test(navigator.platform) ? "mac" : "other");
    sync();
    return subscribeShortcutsChanged(sync);
  }, [sync]);

  const entries = useMemo(() => listShortcutBindings(bindings), [bindings]);

  const exclude = useMemo(() => {
    if (!editor || editor.mode !== "edit") return undefined;
    return { id: editor.id, index: editor.index };
  }, [editor]);

  const conflict = useMemo<ShortcutConflict | null>(() => {
    if (!draft) return null;
    return findShortcutConflict(draft, exclude, bindings);
  }, [bindings, draft, exclude]);

  const editorActionId =
    editor?.mode === "edit"
      ? editor.id
      : editor?.mode === "add"
        ? editor.id
        : null;

  const captureReady =
    editor?.mode === "edit" || (editor?.mode === "add" && editor.id != null);

  const displayLabel = useMemo(() => {
    if (preview) return formatCapturePreview(preview, platform);
    if (draft) return formatChord(draft, platform);
    return null;
  }, [draft, platform, preview]);

  const captureStatus = useMemo(() => {
    if (!draft) return null;
    if (blocked) return "reserved" as const;
    if (conflict) return "conflict" as const;
    return "available" as const;
  }, [blocked, conflict, draft]);

  function resetCapture(nextDraft: ShortcutChord | null = null) {
    setDraft(nextDraft);
    setPreview(
      nextDraft
        ? {
            mod: nextDraft.mod,
            shift: nextDraft.shift,
            alt: nextDraft.alt,
            key: nextDraft.key,
          }
        : null,
    );
    setBlocked(nextDraft ? isBlockedChord(nextDraft) : false);
  }

  function openEdit(entry: ShortcutBindingEntry) {
    setEditor({ mode: "edit", id: entry.id, index: entry.index });
    resetCapture(entry.chord);
  }

  function openAdd() {
    setEditor({ mode: "add", id: null });
    resetCapture(null);
  }

  function closeEditor() {
    setEditor(null);
    resetCapture(null);
  }

  function handleCaptureKeyDown(event: React.KeyboardEvent) {
    if (!captureReady) return;
    event.preventDefault();
    event.stopPropagation();

    const nextPreview = capturePreviewFromKeyboardEvent(event.nativeEvent);
    setPreview(nextPreview);

    const chord = chordFromKeyboardEvent(event.nativeEvent);
    if (!chord) {
      setDraft(null);
      setBlocked(false);
      return;
    }

    setDraft(chord);
    setBlocked(isBlockedChord(chord));
  }

  function handleCaptureKeyUp(event: React.KeyboardEvent) {
    if (!captureReady || draft) return;
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      setPreview(null);
      return;
    }
    setPreview({
      mod: event.metaKey || event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      key: null,
    });
  }

  function commit(replaceConflict: boolean) {
    if (!editor || !draft || blocked) return;
    if (editor.mode === "add") {
      if (!editor.id) return;
      addShortcutChord(editor.id, draft, { replaceConflict });
    } else {
      setShortcutChord(editor.id, draft, {
        index: editor.index,
        replaceConflict,
      });
    }
    toast.success(t("shortcuts.saved"));
    closeEditor();
  }

  function handleResetOne(id: ShortcutId) {
    resetShortcut(id);
    toast.success(t("shortcuts.resetOneDone"));
  }

  function handleRemoveExtra(id: ShortcutId, index: number) {
    removeShortcutChord(id, index);
    toast.success(t("shortcuts.removed"));
  }

  function handleResetAll() {
    resetAllShortcuts();
    setResetAllOpen(false);
    toast.success(t("shortcuts.resetAllDone"));
  }

  function defaultLabel(id: ShortcutId) {
    const def = getShortcutDefinition(id);
    const chord = def?.defaultChords[0];
    if (!chord) return "";
    return formatChord(chord, platform);
  }

  const tReserved = useTranslations("settings.shortcuts.reservedPurposes");
  const tGroups = useTranslations("settings.shortcuts.reservedGroups");

  const reservedSections = useMemo(() => {
    return RESERVED_SHORTCUT_GROUPS.map((group) => ({
      group,
      title: tGroups(group),
      items: BROWSER_RESERVED_SHORTCUTS.filter((item) => item.group === group).map(
        (item) => ({
          keys: formatReservedShortcut(item, platform),
          purpose: tReserved(item.purposeKey),
          purposeKey: item.purposeKey,
        }),
      ),
    })).filter((section) => section.items.length > 0);
  }, [platform, tGroups, tReserved]);


  return (
    <SettingsPanel
      id="settings-shortcuts"
      title={t("shortcuts.title")}
      description={t("shortcuts.description")}
    >
      <div className="settings-row settings-row-action">
        <div className="settings-row-copy">
          <p className="settings-row-title">{t("shortcuts.enabled")}</p>
          <p className="settings-row-hint">{t("shortcuts.enabledDescription")}</p>
        </div>
        <div className="settings-choice-row" role="group">
          <button
            type="button"
            className={cn("settings-choice-chip", enabled && "is-active")}
            aria-pressed={enabled}
            onClick={() => setShortcutsEnabled(true)}
          >
            {t("shortcuts.on")}
          </button>
          <button
            type="button"
            className={cn("settings-choice-chip", !enabled && "is-active")}
            aria-pressed={!enabled}
            onClick={() => setShortcutsEnabled(false)}
          >
            {t("shortcuts.off")}
          </button>
        </div>
      </div>

      <div className="settings-shortcut-list" role="list">
        {entries.map((entry) => {
          const actionName = t(`shortcuts.actions.${entry.id}`);
          const actionDescription = t(
            `shortcuts.actionDescriptions.${entry.id}`,
          );
          const hasDefault = actionHasBuiltInDefault(entry.id);

          return (
            <div
              key={`${entry.id}-${entry.index}`}
              className="settings-shortcut-row"
              role="listitem"
            >
              <div className="settings-shortcut-action">
                <p
                  className={cn(
                    "settings-row-title",
                    entry.isExtra && "settings-shortcut-continuation",
                  )}
                >
                  {actionName}
                </p>
                {!entry.isExtra ? (
                  <p className="settings-shortcut-meta">{actionDescription}</p>
                ) : null}
                {entry.isDefault ? (
                  <p className="settings-shortcut-meta settings-shortcut-badge">
                    {t("shortcuts.defaultBadge")}
                  </p>
                ) : null}
                {entry.isCustomized && !entry.isExtra && hasDefault ? (
                  <p className="settings-shortcut-meta settings-shortcut-custom">
                    {t("shortcuts.customized")}
                    {" · "}
                    {t("shortcuts.defaultWas", {
                      keys: defaultLabel(entry.id),
                    })}
                  </p>
                ) : null}
                {entry.isExtra ? (
                  <p className="settings-shortcut-meta settings-shortcut-extra">
                    {t("shortcuts.extraBadge")}
                  </p>
                ) : null}
              </div>
              <div className="settings-shortcut-keys">
                <kbd
                  className={cn(
                    "settings-kbd",
                    entry.isCustomized && "is-custom",
                    entry.isExtra && "is-extra",
                    !hasDefault && "is-custom",
                  )}
                >
                  {formatChord(entry.chord, platform)}
                </kbd>
              </div>
              <div className="settings-shortcut-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="route-quiet-action"
                  data-route-action="settings"
                  onClick={() => openEdit(entry)}
                >
                  {t("shortcuts.edit")}
                </Button>
                {entry.isExtra || !hasDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      entry.isExtra
                        ? handleRemoveExtra(entry.id, entry.index)
                        : handleResetOne(entry.id)
                    }
                  >
                    {t("shortcuts.remove")}
                  </Button>
                ) : isShortcutCustomized(entry.id) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetOne(entry.id)}
                  >
                    {t("shortcuts.resetOne")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="settings-shortcut-toolbar">
        <Button
          type="button"
          variant="outline"
          className="route-quiet-action"
          data-route-action="settings"
          onClick={openAdd}
        >
          <Plus className="size-4" />
          {t("shortcuts.add")}
        </Button>
      </div>

      <div className="settings-row settings-row-action">
        <div className="settings-row-copy">
          <p className="settings-row-title">{t("shortcuts.resetAll")}</p>
          <p className="settings-row-hint">{t("shortcuts.resetAllDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="route-quiet-action shrink-0"
          data-route-action="settings"
          onClick={() => setResetAllOpen(true)}
        >
          <RotateCcw className="size-4" />
          {t("shortcuts.resetAll")}
        </Button>
      </div>

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="settings-shortcut-dialog flex h-[min(92dvh,52rem)] max-h-[min(92dvh,52rem)] w-[min(100%-1.5rem,72rem)] max-w-[min(100%-1.5rem,72rem)] flex-col gap-4 overflow-hidden sm:max-w-[min(100%-1.5rem,72rem)]">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "add"
                ? t("shortcuts.addTitle")
                : editorActionId
                  ? t("shortcuts.editTitle", {
                      action: t(`shortcuts.actions.${editorActionId}`),
                    })
                  : t("shortcuts.edit")}
            </DialogTitle>
            <DialogDescription>
              {editor?.mode === "add"
                ? t("shortcuts.addDescription")
                : t("shortcuts.editDescription")}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "settings-shortcut-dialog-body",
              editor?.mode === "add" && "is-add",
            )}
          >
            {editor?.mode === "add" ? (
              <div className="settings-shortcut-pick" role="listbox">
                <p className="settings-shortcut-pick-label">
                  {t("shortcuts.chooseAction")}
                </p>
                <div className="settings-shortcut-pick-list">
                  {APP_SHORTCUTS.map((item) => {
                    const selected = editor.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "settings-shortcut-pick-option",
                          selected && "is-active",
                        )}
                        onClick={() => {
                          setEditor({ mode: "add", id: item.id });
                          resetCapture(null);
                        }}
                      >
                        <span className="settings-shortcut-pick-name">
                          {t(`shortcuts.actions.${item.actionKey}`)}
                        </span>
                        <span className="settings-shortcut-pick-desc">
                          {t(`shortcuts.actionDescriptions.${item.actionKey}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="settings-shortcut-recorder">
              <button
                key={editorActionId ?? "capture"}
                type="button"
                className={cn(
                  "settings-shortcut-capture",
                  !captureReady && "is-waiting",
                  captureStatus === "available" && "is-available",
                  captureStatus === "conflict" && "is-conflict",
                  captureStatus === "reserved" && "is-reserved",
                )}
                onKeyDown={handleCaptureKeyDown}
                onKeyUp={handleCaptureKeyUp}
                tabIndex={captureReady ? 0 : -1}
                disabled={!captureReady}
                autoFocus={captureReady}
              >
                <span className="settings-shortcut-capture-label">
                  {captureReady
                    ? t("shortcuts.pressKeys")
                    : t("shortcuts.pickActionFirst")}
                </span>
                {editorActionId ? (
                  <span className="settings-shortcut-capture-action">
                    {t(`shortcuts.actions.${editorActionId}`)}
                  </span>
                ) : null}
                <kbd className="settings-kbd settings-kbd-lg">
                  {displayLabel ?? "—"}
                </kbd>
              </button>

              {captureStatus === "available" && draft ? (
                <p className="settings-shortcut-status is-ok">
                  {t("shortcuts.statusAvailable", {
                    keys: formatChord(draft, platform),
                  })}
                </p>
              ) : null}

              {captureStatus === "conflict" && conflict && draft ? (
                <p className="settings-shortcut-status is-warn">
                  {t("shortcuts.statusConflict", {
                    keys: formatChord(draft, platform),
                    action: t(`shortcuts.actions.${conflict.id}`),
                  })}
                </p>
              ) : null}

              {captureStatus === "reserved" && draft ? (
                <p className="settings-shortcut-status is-error">
                  {t("shortcuts.statusReserved", {
                    keys: formatChord(draft, platform),
                  })}
                </p>
              ) : null}

              <aside className="settings-shortcut-reserved">
                <p className="settings-shortcut-reserved-title">
                  {t("shortcuts.reservedTitle")}
                </p>
                <p className="settings-shortcut-reserved-lede">
                  {t("shortcuts.reservedDescription")}
                </p>
                <div className="settings-shortcut-reserved-sections">
                  {reservedSections.map((section) => (
                    <div
                      key={section.group}
                      className="settings-shortcut-reserved-section"
                    >
                      <p className="settings-shortcut-reserved-section-title">
                        {section.title}
                      </p>
                      <ul className="settings-shortcut-reserved-list">
                        {section.items.map((item) => (
                          <li key={`${section.group}-${item.purposeKey}`}>
                            <kbd className="settings-kbd settings-kbd-sm">
                              {item.keys}
                            </kbd>
                            <span>{item.purpose}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              {tc("cancel")}
            </Button>
            {conflict && !blocked && draft ? (
              <Button type="button" onClick={() => commit(true)}>
                {t("shortcuts.replace")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={
                  !draft ||
                  blocked ||
                  !captureReady ||
                  (editor?.mode === "edit" &&
                    draft != null &&
                    chordEquals(
                      draft,
                      bindings[editor.id]?.[editor.index] ?? draft,
                    ))
                }
                onClick={() => commit(false)}
              >
                {tc("save")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shortcuts.resetAllConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("shortcuts.resetAllConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetAllOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="button" onClick={handleResetAll}>
              {t("shortcuts.resetAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPanel>
  );
}
