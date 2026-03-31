"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx } from "clsx";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetPortal = Dialog.Portal;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetOverlay({ className }: { className?: string }) {
  return (
    <Dialog.Overlay
      className={clsx("fixed inset-0 z-40 bg-black/70 backdrop-blur-sm", className)}
    />
  );
}

export function SheetContent({
  children,
  className,
  side = "right",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={clsx(
          "fixed top-0 z-50 flex h-full w-full max-w-xl flex-col border-border bg-card text-card-foreground shadow-2xl outline-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className
        )}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X size={16} />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  );
}
