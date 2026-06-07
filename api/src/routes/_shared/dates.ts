// ISO-8601 datetime / date validation (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss[.sss]Z)
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/;

export function parseISODate(value: string, fieldName: string): Date {
  if (!ISO8601_RE.test(value)) {
    throw new Error(`${fieldName} must be ISO-8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  return d;
}
