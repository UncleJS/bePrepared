import { CategoryManager } from "@/components/settings/CategoryManager";
import { AdminAccessNotice } from "@/components/settings/AdminAccessNotice";
import { useAuth } from "@/contexts/AuthContext";

export default function EquipmentCategoriesPage() {
  const { state } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.isAdmin;

  if (!isAdmin) {
    return <AdminAccessNotice section="Equipment categories" />;
  }

  return (
    <CategoryManager
      title="Equipment Categories"
      categoryPath={(householdId) => `/equipment/${householdId}/categories`}
      itemPath={(householdId) => `/equipment/${householdId}`}
      namePlaceholder="Power"
      slugPlaceholder="power"
      backHref="/settings"
    />
  );
}
