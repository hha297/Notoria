export type TutorialPlacement = "top" | "bottom" | "left" | "right" | "center";

const VIEWPORT_MARGIN = 16;
const TARGET_GAP = 12;

type PopoverSize = {
  width: number;
  height: number;
};

type PopoverPosition = {
  top: number;
  left: number;
  placement: TutorialPlacement;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitsBelow(target: DOMRect, size: PopoverSize) {
  return target.bottom + TARGET_GAP + size.height <= window.innerHeight - VIEWPORT_MARGIN;
}

function fitsAbove(target: DOMRect, size: PopoverSize) {
  return target.top - TARGET_GAP - size.height >= VIEWPORT_MARGIN;
}

function fitsRight(target: DOMRect, size: PopoverSize) {
  return target.right + TARGET_GAP + size.width <= window.innerWidth - VIEWPORT_MARGIN;
}

function fitsLeft(target: DOMRect, size: PopoverSize) {
  return target.left - TARGET_GAP - size.width >= VIEWPORT_MARGIN;
}

function centerFallback(size: PopoverSize): PopoverPosition {
  return {
    top: clamp(
      window.innerHeight / 2 - size.height / 2,
      VIEWPORT_MARGIN,
      window.innerHeight - size.height - VIEWPORT_MARGIN,
    ),
    left: clamp(
      window.innerWidth / 2 - size.width / 2,
      VIEWPORT_MARGIN,
      window.innerWidth - size.width - VIEWPORT_MARGIN,
    ),
    placement: "center",
  };
}

export function getTutorialPopoverPosition(
  target: DOMRect | null,
  size: PopoverSize,
): PopoverPosition {
  if (!target || size.width <= 0 || size.height <= 0) {
    return centerFallback(size);
  }

  const targetCenterY = target.top + target.height / 2;
  const targetCenterX = target.left + target.width / 2;
  const preferBottom = targetCenterY < window.innerHeight * 0.45;
  const preferTop = targetCenterY > window.innerHeight * 0.55;
  const preferRight = targetCenterX < window.innerWidth * 0.45;
  const preferLeft = targetCenterX > window.innerWidth * 0.55;

  const candidates: Array<{
    placement: Exclude<TutorialPlacement, "center">;
    fits: boolean;
    position: PopoverPosition;
  }> = [];

  const addCandidate = (
    placement: Exclude<TutorialPlacement, "center">,
    fits: boolean,
    top: number,
    left: number,
  ) => {
    candidates.push({
      placement,
      fits,
      position: {
        top: clamp(
          top,
          VIEWPORT_MARGIN,
          window.innerHeight - size.height - VIEWPORT_MARGIN,
        ),
        left: clamp(
          left,
          VIEWPORT_MARGIN,
          window.innerWidth - size.width - VIEWPORT_MARGIN,
        ),
        placement,
      },
    });
  };

  addCandidate(
    "bottom",
    fitsBelow(target, size),
    target.bottom + TARGET_GAP,
    target.left + target.width / 2 - size.width / 2,
  );
  addCandidate(
    "top",
    fitsAbove(target, size),
    target.top - TARGET_GAP - size.height,
    target.left + target.width / 2 - size.width / 2,
  );
  addCandidate(
    "right",
    fitsRight(target, size),
    target.top + target.height / 2 - size.height / 2,
    target.right + TARGET_GAP,
  );
  addCandidate(
    "left",
    fitsLeft(target, size),
    target.top + target.height / 2 - size.height / 2,
    target.left - TARGET_GAP - size.width,
  );

  const order = [
    preferBottom ? "bottom" : null,
    preferTop ? "top" : null,
    preferRight ? "right" : null,
    preferLeft ? "left" : null,
    "bottom",
    "top",
    "right",
    "left",
  ].filter(Boolean) as Exclude<TutorialPlacement, "center">[];

  for (const placement of order) {
    const match = candidates.find((item) => item.placement === placement && item.fits);
    if (match) return match.position;
  }

  const first = candidates.find((item) => item.fits);
  if (first) return first.position;

  return centerFallback(size);
}
