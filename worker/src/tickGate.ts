/** Prevents a slow alert tick from overlapping the next interval. */
export function createTickGate() {
  let inFlight = false;
  return {
    tryEnter(): boolean {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    leave(): void {
      inFlight = false;
    },
  };
}
