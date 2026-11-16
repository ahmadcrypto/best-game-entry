// Keyboard and mouse, read fresh every frame. Keys are tracked by
// code (KeyW, ArrowLeft, Space, ...), so layouts do not matter, and
// presses are edges: `pressed(code)` is true only on the frame the key
// went down, which is what menus and the dash want.
const MOVE_KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
};

export function createInput(canvas) {
  const down = new Set();
  const justPressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    down.add(event.code);
    justPressed.add(event.code);
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
        event.code,
      )
    ) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    down.delete(event.code);
  }
  function onBlur() {
    down.clear();
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouseClicked = true;
    justPressed.add('Mouse');
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Normalised sail direction from the held movement keys. */
    axis() {
      let x = 0;
      let y = 0;
      if (MOVE_KEYS.left.some((c) => down.has(c))) x -= 1;
      if (MOVE_KEYS.right.some((c) => down.has(c))) x += 1;
      if (MOVE_KEYS.up.some((c) => down.has(c))) y -= 1;
      if (MOVE_KEYS.down.some((c) => down.has(c))) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** True only on the frame the key (or mouse click) went down. */
    pressed(code) {
      return justPressed.has(code);
    },
    get mouse() {
      return { x: mouseX, y: mouseY, clicked: mouseClicked };
    },
    /** Call at the end of each frame: edges live for one frame only. */
    endFrame() {
      justPressed.clear();
      mouseClicked = false;
    },
  };
}

export const ACTION_CONFIRM = 'Enter';
export const ACTION_DASH = 'Space';
export const ACTION_PAUSE = 'KeyP';
export const ACTION_MUTE = 'KeyM';
export const ACTION_RESTART = 'KeyR';
