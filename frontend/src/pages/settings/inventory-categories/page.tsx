import { CategoryManager } from "@/components/settings/CategoryManager";
import { AdminAccessNotice } from "@/components/settings/AdminAccessNotice";
import { useAuth } from "@/contexts/AuthContext";

export default function InventoryCategoriesPage() {
  const { state } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.isAdmin;

  if (!isAdmin) {
    return <AdminAccessNotice section="Inventory categories" />;
  }

  return (
    <CategoryManager
      title="Inventory Categories"
      categoryPath={(householdId) => `/inventory/${householdId}/categories`}
      itemPath={(householdId) => `/inventory/${householdId}/items`}
      namePlaceholder="Water"
      slugPlaceholder="water"
      backHref="/settings"
    />
  );
}
