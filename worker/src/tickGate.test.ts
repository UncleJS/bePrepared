import { describe, expect, it } from "bun:test";
import { createTickGate } from "./tickGate";

describe("tick gate", () => {
  it("rejects a second enter until the first run leaves", () => {
    const gate = createTickGate();
    expect(gate.tryEnter()).toBe(true);
    expect(gate.tryEnter()).toBe(false);
    gate.leave();
    expect(gate.tryEnter()).toBe(true);
  });
});
