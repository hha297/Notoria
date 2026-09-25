"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAB_SIZE = 40;
const STORAGE_KEY = "notoria.mobile-nav-fab";

type Pos = { x: number; y: number };

function clampPos(x: number, y: number): Pos {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(0, window.innerWidth - FAB_SIZE);
  const maxY = Math.max(0, window.innerHeight - FAB_SIZE);
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 8, y: 8 };
  return clampPos(8, 8);
}

function readStoredPos(): Pos | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
      return null;
    }
    return clampPos(parsed.x, parsed.y);
  } catch {
    return null;
  }
}

type MobileNavFabProps = {
  onOpen: () => void;
};

/**
 * Portaled fixed overlay — lives on document.body so paper overflow/borders
 * never clip it. Drag across the full viewport (including outside the paper).
 */
export function MobileNavFab({ onOpen }: MobileNavFabProps) {
  const [pos, setPos] = useState<Pos>(defaultPos);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    setPos(readStoredPos() ?? defaultPos());
    setReady(true);

    function onResize() {
      setPos((current) => clampPos(current.x, current.y));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function persist(next: Pos) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && dx * dx + dy * dy > 16) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    event.preventDefault();
    setPos(clampPos(drag.origX + dx, drag.origY + dy));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    if (drag.moved) {
      setPos((current) => {
        const next = clampPos(current.x, current.y);
        persist(next);
        return next;
      });
    } else {
      onOpen();
    }
    dragRef.current = null;
  }

  if (!mounted) return null;

  return createPortal(
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Open navigation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "fixed z-40 size-10 touch-none border-hairline-cloud elevated-surface shadow-[0_8px_24px_rgba(0,0,0,0.18)] lg:hidden",
        "supports-backdrop-filter:backdrop-blur-md",
        !ready && "invisible",
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <Menu className="pointer-events-none size-4" />
    </Button>,
    document.body,
  );
}
