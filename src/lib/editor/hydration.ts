/** Wait two frames so TipTap can finish setContent/onUpdate hydration. */
export function afterEditorHydration(callback: () => void) {
  let outer = 0;
  let inner = 0;
  outer = window.requestAnimationFrame(() => {
    inner = window.requestAnimationFrame(callback);
  });
  return () => {
    window.cancelAnimationFrame(outer);
    window.cancelAnimationFrame(inner);
  };
}
