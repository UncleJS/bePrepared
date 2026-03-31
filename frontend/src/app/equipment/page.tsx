import { redirect } from "next/navigation";

export default function EquipmentRedirectPage() {
  redirect("/supplies?tab=equipment");
}
