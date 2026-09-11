"use client";

type CheckboxOptionProps = {
  id: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function CheckboxOption({
  id,
  checked,
  label,
  onChange,
}: CheckboxOptionProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-input accent-[var(--accent-lime)]"
      />
      <span>{label}</span>
    </label>
  );
}
