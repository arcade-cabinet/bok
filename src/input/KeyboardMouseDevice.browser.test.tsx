import { describe, expect, it } from 'vitest';
import { ActionMap } from './ActionMap';
import { KeyboardMouseDevice } from './KeyboardMouseDevice';

describe('KeyboardMouseDevice — pointer lock gating', () => {
  it('ignores mouse movement when pointer is not locked', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const device = new KeyboardMouseDevice(ActionMap.desktopDefaults());
    device.attach(canvas);

    // No pointer lock — movementX/Y should be ignored
    canvas.dispatchEvent(new MouseEvent('mousemove', { movementX: 500, movementY: 300 }));

    const delta = device.consumeMouseDelta();
    expect(delta.x).toBe(0);
    expect(delta.y).toBe(0);

    document.body.removeChild(canvas);
  });

  it('consumeMouseDelta returns zero when no movement', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const device = new KeyboardMouseDevice(ActionMap.desktopDefaults());
    device.attach(canvas);

    const delta = device.consumeMouseDelta();
    expect(delta.x).toBe(0);
    expect(delta.y).toBe(0);

    document.body.removeChild(canvas);
  });

  it('does not accumulate pre-lock mouse movement', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const device = new KeyboardMouseDevice(ActionMap.desktopDefaults());
    device.attach(canvas);

    // Move mouse before lock — these should be discarded
    canvas.dispatchEvent(new MouseEvent('mousemove', { movementX: 1000, movementY: -800 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { movementX: 500, movementY: 200 }));

    const delta = device.consumeMouseDelta();
    expect(delta.x).toBe(0);
    expect(delta.y).toBe(0);

    document.body.removeChild(canvas);
  });
});
