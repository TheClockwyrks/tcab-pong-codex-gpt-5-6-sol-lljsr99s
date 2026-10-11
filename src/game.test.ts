import { describe, expect, it, vi } from "vitest";
import type { InitApi } from "@clockwyrks/simple-2d";
import { game, type CaromState } from "./game";
import { FIELD_CX, FIELD_CY, HOLD_TIME } from "./constants";

function init() {
  const register = vi.fn();
  const api = {
    input: { register, layout: () => null },
    audio: { define: vi.fn(), load: vi.fn() },
    diagnostics: { register: vi.fn() },
  } as unknown as InitApi<CaromState>;
  const result = game.initialize(api);
  if (result instanceof Promise)
    throw new Error("unexpected async initialization");
  return { state: result[0], debug: result[1], register };
}

describe("Carom state and automation", () => {
  it("builds the complete title world and registers eight actions", () => {
    const { state, debug, register } = init();
    expect(state.screen).toBe("title");
    expect(state.ball).toMatchObject({
      x: FIELD_CX,
      y: FIELD_CY,
      held: true,
      holdTimer: HOLD_TIME,
    });
    expect(state.obstacles).toHaveLength(2);
    expect(register).toHaveBeenCalledTimes(8);
    expect(debug.version).toBe(1);
  });

  it("poses entities immutably and reports derived speed", () => {
    const { state, debug } = init();
    const moved = debug.setBallVelocity(state, 300, 400);
    const snapshot = debug.snapshot(moved) as { ball: { speed: number } };
    expect(snapshot.ball.speed).toBe(500);
    expect(state.ball?.vx).toBe(0);
    expect(debug.clearWorld(moved)).toMatchObject({
      ball: null,
      obstacles: [],
    });
  });

  it("reconciles obstacle poses and rejects missing entities", () => {
    const { state, debug } = init();
    const posed = debug.setObstacleClock(state, 0.9);
    expect(posed.obstacles[0].cy).toBeCloseTo(300);
    expect(() => debug.setBallSpin(debug.clearWorld(state), 2)).toThrow(
      /no ball/i,
    );
    expect(() => debug.spawnObstacle(state, 3)).toThrow(/index 3/i);
  });
});
