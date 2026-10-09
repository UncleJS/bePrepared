import { useAuth } from "@/contexts/AuthContext";
import { UserManager } from "@/components/settings/UserManager";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function UsersPage() {
  const { state } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.isAdmin;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">{isAdmin ? "Users" : "My profile"}</h1>
        <p className="text-sm text-foreground mt-1">
          {isAdmin
            ? "Manage user accounts and your personal profile."
            : "Update your username, email, and password."}
        </p>
      </div>

      <UserManager />
    </div>
  );
}
