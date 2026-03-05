export function shouldRedirectToLogin(auth: { user?: unknown } | null | undefined): boolean {
  return !auth?.user;
}
