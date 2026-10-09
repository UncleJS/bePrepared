import { describe, expect, it } from "bun:test";
import { createLoadGates } from "./loadGates.ts";

describe("equipment load gates", () => {
  it("keeps the main list current when an archived load starts", () => {
    const gates = createLoadGates();
    const listId = gates.beginList();
    gates.beginArchived();
    expect(gates.isCurrentList(listId)).toBe(true);
    expect(gates.isCurrentArchived(1)).toBe(true);
  });

  it("drops a stale list load without affecting archived loads", () => {
    const gates = createLoadGates();
    const firstList = gates.beginList();
    const archivedId = gates.beginArchived();
    const secondList = gates.beginList();
    expect(gates.isCurrentList(firstList)).toBe(false);
    expect(gates.isCurrentList(secondList)).toBe(true);
    expect(gates.isCurrentArchived(archivedId)).toBe(true);
  });
});
