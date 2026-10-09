import { describe, expect, it } from "bun:test";
import { MAX_BODY_BYTES, shouldRejectBodySize } from "./bodyLimit";

describe("shouldRejectBodySize", () => {
  it("rejects chunked transfer encoding", () => {
    expect(
      shouldRejectBodySize({
        transferEncoding: "chunked",
        contentLengthHeader: null,
        contentType: "application/json",
      })
    ).toBe(true);
  });

  it("rejects oversize or non-finite Content-Length", () => {
    expect(
      shouldRejectBodySize({
        transferEncoding: null,
        contentLengthHeader: String(MAX_BODY_BYTES + 1),
        contentType: "application/json",
      })
    ).toBe(true);
    expect(
      shouldRejectBodySize({
        transferEncoding: null,
        contentLengthHeader: "not-a-number",
        contentType: "application/json",
      })
    ).toBe(true);
  });

  it("allows bodyless PATCH (no content-type, no length)", () => {
    expect(
      shouldRejectBodySize({
        transferEncoding: null,
        contentLengthHeader: null,
        contentType: null,
      })
    ).toBe(false);
  });

  it("allows measured bodies under the cap when Content-Length is missing", () => {
    expect(
      shouldRejectBodySize({
        transferEncoding: null,
        contentLengthHeader: null,
        contentType: "application/json",
        measuredBytes: 100,
      })
    ).toBe(false);
    expect(
      shouldRejectBodySize({
        transferEncoding: null,
        contentLengthHeader: null,
        contentType: "application/json",
        measuredBytes: MAX_BODY_BYTES + 1,
      })
    ).toBe(true);
  });
});
