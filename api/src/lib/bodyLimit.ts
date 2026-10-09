/** Max request body size for POST/PUT/PATCH (1 MB). */
export const MAX_BODY_BYTES = 1_000_000;

/**
 * Decide whether a mutating request should be rejected as too large.
 * Returns true when the request must be answered with 413.
 */
export function shouldRejectBodySize(opts: {
  transferEncoding: string | null;
  contentLengthHeader: string | null;
  contentType: string | null;
  measuredBytes?: number;
  maxBytes?: number;
}): boolean {
  const max = opts.maxBytes ?? MAX_BODY_BYTES;
  if (opts.transferEncoding) return true;
  const raw = opts.contentLengthHeader;
  if (raw != null && raw !== "") {
    const contentLength = Number(raw);
    return !Number.isFinite(contentLength) || contentLength < 0 || contentLength > max;
  }
  // Missing Content-Length: bodyless (no content-type) is fine; otherwise use
  // a measured byte count when the caller has one.
  if (!opts.contentType) return false;
  if (opts.measuredBytes == null) return false;
  return opts.measuredBytes > max;
}
