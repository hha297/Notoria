"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createExerciseInstructionPreset,
  deleteExerciseInstructionPreset,
  listExerciseInstructionPresets,
  updateExerciseInstructionPreset,
  type ExerciseInstructionPresetItem,
} from "@/lib/actions/exercise-instruction-presets";
import { featureEnabled } from "@/lib/billing/plans";
import {
  presetSettingsEqual,
  type ExercisePresetSettings,
} from "@/lib/exercises/preset-settings";
import { cn } from "@/lib/utils";

const NONE_VALUE = "__none__";

type ExerciseAdditionalInstructionsProps = {
  scope: "vocabulary" | "theory";
  value: string;
  onChange: (value: string) => void;
  settings?: ExercisePresetSettings;
  onSettingsChange?: (settings: ExercisePresetSettings) => void;
  disabled?: boolean;
};

export function ExerciseAdditionalInstructions({
  scope,
  value,
  onChange,
  settings = {},
  onSettingsChange,
  disabled = false,
}: ExerciseAdditionalInstructionsProps) {
  const t = useTranslations("exercises.ai");
  const tBilling = useTranslations("billing");
  const tCommon = useTranslations("common");
  const { entitlementPlan, openUpgrade } = useProAccess();
  const unlocked = featureEnabled(entitlementPlan, "exercise_custom_instructions");
  const [presets, setPresets] = useState<ExerciseInstructionPresetItem[]>([]);
  const [presetId, setPresetId] = useState("");
  const [pending, startTransition] = useTransition();
  const [saveOpen, setSaveOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dialogName, setDialogName] = useState("");

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    void listExerciseInstructionPresets(scope).then((rows) => {
      if (!cancelled) setPresets(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, unlocked]);

  const selected = presets.find((item) => item.id === presetId) ?? null;
  const dirty = Boolean(
    selected &&
      (selected.instructions !== value.trim() ||
        !presetSettingsEqual(selected.settings, settings)),
  );

  const applyPreset = (preset: ExerciseInstructionPresetItem) => {
    onChange(preset.instructions);
    onSettingsChange?.(preset.settings);
  };

  const failToast = (code: string) => {
    toast.error(
      code === "PREMIUM_REQUIRED" ? t("premiumRequired") : t("presetSaveFailed"),
    );
    if (code === "PREMIUM_REQUIRED") openUpgrade();
  };

  const field = (
    <Textarea
      value={value}
      readOnly={!unlocked}
      disabled={disabled && unlocked}
      aria-disabled={!unlocked || undefined}
      tabIndex={unlocked ? undefined : 0}
      placeholder={t("additionalInstructionsPlaceholder")}
      onChange={(event) => {
        if (!unlocked) return;
        onChange(event.target.value);
      }}
      onClick={() => {
        if (!unlocked) openUpgrade();
      }}
      onKeyDown={(event) => {
        if (!unlocked && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openUpgrade();
        }
      }}
      className={
        unlocked
          ? "min-h-20 control-surface"
          : "min-h-20 cursor-pointer opacity-60 control-surface"
      }
    />
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`exercise-extra-${scope}`}>
            {t("additionalInstructions")}
          </Label>
          {!unlocked ? (
            <Badge variant="pro">{tBilling("premiumBadge")}</Badge>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {unlocked
            ? t("additionalInstructionsHelper")
            : t("additionalInstructionsLocked")}
        </p>
        {unlocked ? (
          <div id={`exercise-extra-${scope}`}>{field}</div>
        ) : (
          <Tooltip>
            <TooltipTrigger render={<div className="block w-full" />}>
              {field}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-left">
              {t("additionalInstructionsLocked")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {unlocked ? (
        <div className="space-y-2 rounded-xl border border-page-accent-border/70 control-surface p-3 sm:p-3.5">
          <div className="space-y-1">
            <Label>{t("presetsTitle")}</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("presetsHelper")}
            </p>
          </div>

          {presets.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-page-accent-border/80 bg-background/40 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t("presetsEmpty")}</p>
              <Button
                type="button"
                size="sm"
                disabled={disabled || pending}
                onClick={() => {
                  setDialogName("");
                  setSaveOpen(true);
                }}
              >
                {t("presetSaveAs")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={presetId || NONE_VALUE}
                disabled={disabled || pending}
                onValueChange={(next) => {
                  if (!next || next === NONE_VALUE) {
                    setPresetId("");
                    return;
                  }
                  setPresetId(next);
                  const preset = presets.find((item) => item.id === next);
                  if (preset) applyPreset(preset);
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t("presetsTitle")}
                  className="min-w-0 flex-1 sm:max-w-72"
                >
                  <SelectValue>
                    {selected?.name ?? t("presetNone")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{t("presetNone")}</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || pending}
                  onClick={() => {
                    setDialogName("");
                    setSaveOpen(true);
                  }}
                >
                  {t("presetSaveAs")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={!selected || disabled || pending}
                    aria-label={t("presetManage")}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "icon-sm" }),
                    )}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    {dirty ? (
                      <DropdownMenuItem
                        disabled={pending}
                        onClick={() => {
                          if (!selected) return;
                          startTransition(async () => {
                            const result = await updateExerciseInstructionPreset({
                              id: selected.id,
                              instructions: value,
                              settings,
                            });
                            if (!result.ok) {
                              failToast(result.code);
                              return;
                            }
                            setPresets((current) =>
                              current
                                .map((item) =>
                                  item.id === result.preset.id
                                    ? result.preset
                                    : item,
                                )
                                .sort((left, right) =>
                                  left.name.localeCompare(right.name),
                                ),
                            );
                            toast.success(t("presetUpdated"));
                          });
                        }}
                      >
                        {t("presetUpdateCurrent")}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      disabled={pending}
                      onClick={() => {
                        if (!selected) return;
                        setDialogName(selected.name);
                        setRenameOpen(true);
                      }}
                    >
                      {t("presetRename")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={pending}
                      onClick={() => setDeleteOpen(true)}
                    >
                      {t("presetDelete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("presetSaveDialogTitle")}</DialogTitle>
            <DialogDescription>{t("presetSaveDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`preset-save-name-${scope}`}>{t("presetName")}</Label>
            <Input
              id={`preset-save-name-${scope}`}
              value={dialogName}
              onChange={(event) => setDialogName(event.target.value)}
              placeholder={t("presetName")}
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || !dialogName.trim()}
              onClick={() => {
                startTransition(async () => {
                  const result = await createExerciseInstructionPreset({
                    name: dialogName,
                    instructions: value,
                    settings,
                    scope,
                  });
                  if (!result.ok) {
                    failToast(result.code);
                    return;
                  }
                  setPresets((current) =>
                    [...current.filter((item) => item.id !== result.preset.id), result.preset].sort(
                      (left, right) => left.name.localeCompare(right.name),
                    ),
                  );
                  setPresetId(result.preset.id);
                  setSaveOpen(false);
                  setDialogName("");
                  toast.success(t("presetSaved"));
                });
              }}
            >
              {t("presetSaveAs")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("presetRenameDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("presetRenameDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`preset-rename-${scope}`}>{t("presetName")}</Label>
            <Input
              id={`preset-rename-${scope}`}
              value={dialogName}
              onChange={(event) => setDialogName(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || !dialogName.trim() || !selected}
              onClick={() => {
                if (!selected) return;
                startTransition(async () => {
                  const result = await updateExerciseInstructionPreset({
                    id: selected.id,
                    name: dialogName,
                  });
                  if (!result.ok) {
                    failToast(result.code);
                    return;
                  }
                  setPresets((current) =>
                    current
                      .map((item) =>
                        item.id === result.preset.id ? result.preset : item,
                      )
                      .sort((left, right) => left.name.localeCompare(right.name)),
                  );
                  setRenameOpen(false);
                  toast.success(t("presetRenamed"));
                });
              }}
            >
              {t("presetRename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("presetDeleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("presetDeleteDialogDescription", {
                name: selected?.name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !selected}
              onClick={() => {
                if (!selected) return;
                const id = selected.id;
                startTransition(async () => {
                  const result = await deleteExerciseInstructionPreset(id);
                  if (!result.ok) {
                    failToast(result.code);
                    return;
                  }
                  setPresets((current) => current.filter((item) => item.id !== id));
                  setPresetId("");
                  setDeleteOpen(false);
                  toast.success(t("presetDeleted"));
                });
              }}
            >
              {t("presetDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
