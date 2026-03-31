"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto px-6 py-6 sm:max-w-2xl">
        <div className="mb-6 pr-10">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
