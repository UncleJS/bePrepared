const PUBLIC_PATH_PATTERN =
  /^\/(?:_next\/static|_next\/image|favicon\.ico|login(?:\/|$)|api\/auth(?:\/|$)|auth(?:\/|$))/;

export function isProtectedPath(pathname: string): boolean {
  return !PUBLIC_PATH_PATTERN.test(pathname);
}
