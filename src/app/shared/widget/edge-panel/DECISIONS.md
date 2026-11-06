# Decisions — Edge panel

## 2026-11-06 — The panel owns presentation, the page owns the drop

`app-edge-panel` projects ordinary content. It owns the peek, hover/focus reveal, local pin,
and horizontal slide. A nullable viewport `dragPosition` reveals it only near its untransformed
slot; `contains(point)` hit-tests the visible card. It knows nothing about agenda items or
ministering assignments. `visible` defaults to true; false slides the panel completely away and
makes it inert, even when pinned. The agenda binds this to its active drag; ministering keeps the peek.

The whole card background is draggable; controls and CDK items keep their own gestures.
Touch has no hover: tap or slide to open, pin to keep it open. Keyboard focus reveals content,
Enter/Space on the card toggles the pin, and Escape closes it. Closing by hand unpins.

## 2026-11-06 — Follow the canvas box without becoming part of its scroll layout

The fixed host measures its nearest `.canvas-container`, including its bottom edge, on mount,
container resize and window resize. This avoids shell offsets and keeps narrow-screen navigation
outside the panel. `overflow: clip` clips the hidden part without creating a scroll container or
the backdrop root that `clip-path` creates. The card uses the same `.acrylic-card` class as the
original agenda drop zone, including its background, border, radius and shadow.

The open card sits 1rem inside the canvas edge. Its untransformed slot includes that gap and
receives hover while open, so crossing the gap does not close the panel. Only the card is a drop
target. The slide distance uses the slot width (card plus gap), leaving the same peek when closed.
The peek size is declared once and shared with CSS. The existing `HorizontalDragGesture`
handles pointer identity/capture; no drawer rewrite or second gesture engine is needed.
