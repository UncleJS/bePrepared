import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Pages — lazy-loaded to keep initial bundle small
import { lazy, Suspense } from "react";

const LoginPage = lazy(() => import("@/pages/login/Login"));
const DashboardPage = lazy(() => import("@/pages/dashboard/page"));
const ModulesPage = lazy(() => import("@/pages/modules/page"));
const ModuleDetailPage = lazy(() => import("@/pages/modules/[slug]/page"));
const TasksPage = lazy(() => import("@/pages/tasks/page"));
const SuppliesPage = lazy(() => import("@/pages/supplies/page"));
const MaintenancePage = lazy(() => import("@/pages/maintenance/page"));
const PlanningPage = lazy(() => import("@/pages/planning/page"));
const AlertsPage = lazy(() => import("@/pages/alerts/page"));
const SettingsPage = lazy(() => import("@/pages/settings/page"));
const HouseholdPage = lazy(() => import("@/pages/settings/household/page"));
const UsersPage = lazy(() => import("@/pages/settings/users/page"));
const PoliciesPage = lazy(() => import("@/pages/settings/policies/page"));
const ModulesAdminPage = lazy(() => import("@/pages/settings/modules/page"));
const InventoryCategoriesPage = lazy(() => import("@/pages/settings/inventory-categories/page"));
const EquipmentCategoriesPage = lazy(() => import("@/pages/settings/equipment-categories/page"));

// RequireAuth wraps all protected routes
function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <LoadingSpinner label="Loading session…" />;
  }
  if (state.status === "unauthenticated") {
    return (
      <Navigate
        to={`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return <Outlet />;
}

// AppLayout wraps protected pages inside AppShell
function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppShell />
    </div>
  );
}

const pageFallback = <LoadingSpinner label="Loading…" />;

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <Suspense fallback={pageFallback}>
            <LoginPage />
          </Suspense>
        }
      />

      {/* Protected */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={pageFallback}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/modules"
            element={
              <Suspense fallback={pageFallback}>
                <ModulesPage />
              </Suspense>
            }
          />
          <Route
            path="/modules/:slug"
            element={
              <Suspense fallback={pageFallback}>
                <ModuleDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/tasks"
            element={
              <Suspense fallback={pageFallback}>
                <TasksPage />
              </Suspense>
            }
          />
          <Route
            path="/supplies"
            element={
              <Suspense fallback={pageFallback}>
                <SuppliesPage />
              </Suspense>
            }
          />
          {/* Legacy redirect pages */}
          <Route path="/inventory" element={<Navigate to="/supplies?tab=inventory" replace />} />
          <Route path="/equipment" element={<Navigate to="/supplies?tab=equipment" replace />} />
          <Route
            path="/maintenance"
            element={
              <Suspense fallback={pageFallback}>
                <MaintenancePage />
              </Suspense>
            }
          />
          <Route
            path="/planning"
            element={
              <Suspense fallback={pageFallback}>
                <PlanningPage />
              </Suspense>
            }
          />
          <Route
            path="/alerts"
            element={
              <Suspense fallback={pageFallback}>
                <AlertsPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={pageFallback}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/household"
            element={
              <Suspense fallback={pageFallback}>
                <HouseholdPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/families"
            element={<Navigate to="/settings/household" replace />}
          />
          <Route
            path="/settings/users"
            element={
              <Suspense fallback={pageFallback}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/policies"
            element={
              <Suspense fallback={pageFallback}>
                <PoliciesPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/modules"
            element={
              <Suspense fallback={pageFallback}>
                <ModulesAdminPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/inventory-categories"
            element={
              <Suspense fallback={pageFallback}>
                <InventoryCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="/settings/equipment-categories"
            element={
              <Suspense fallback={pageFallback}>
                <EquipmentCategoriesPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* Catch-all → dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
