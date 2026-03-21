export function AdminAccessNotice({ section }: { section: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Admin access required</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {section} settings are only available to administrator accounts.
      </p>
    </div>
  );
}
