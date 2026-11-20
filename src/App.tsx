import { Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, ConfigProvider, Result } from "antd";
import { lazy, Suspense } from "react";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { ALL_NAV_LEAVES } from "./components/nav-config";
import { appTheme } from "./utils/design-system";
import { useHasPermission } from "./hooks/use-permission";
import { PageLoading } from "./components/PageLoading";

// Each page is its own download, fetched the first time it is opened -
// instead of one 3.4 MB bundle holding every page before anything shows.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
const SalesForceManagementPage = lazy(() => import("./pages/SalesForceManagementPage"));
const FofoOnboardingPage = lazy(() => import("./pages/FofoOnboardingPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const LeavePage = lazy(() => import("./pages/LeavePage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const ActivityCalendarPage = lazy(() => import("./pages/ActivityCalendarPage"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage"));
const AuditConsentPage = lazy(() => import("./pages/AuditConsentPage"));
const TeamDashboardPage = lazy(() => import("./pages/TeamDashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CallCenterPage = lazy(() => import("./pages/CallCenterPage"));
const QrCapturePage = lazy(() => import("./pages/QrCapturePage"));

// "/" is also this app's catch-all redirect target (see the final Route
// below), so a plain permission check here can't just redirect to "/" on
// failure the way every other permission-based redirect in this app does -
// that would loop forever. Falls through to whatever other page this
// user actually has a real permission for, same OR-across-permissions rule
// nav-config.tsx already uses to decide what's visible in the sidebar, so
// this never contradicts what the sidebar itself would offer.
function DashboardRoute() {
  const hasPermission = useHasPermission();
  if (hasPermission("dashboard.view")) {
    return <DashboardPage />;
  }
  const fallback = ALL_NAV_LEAVES.find(
    // Never an external link (Support tickets opens Helpdesk in a new tab and
    // has no page here - redirecting to it fell through to "/" and looped).
    (item) => !item.externalUrl && item.path !== "/" && item.permissions?.some((p) => hasPermission(p))
  );
  if (fallback) {
    return <Navigate to={fallback.path} replace />;
  }
  return (
    <Result
      status="403"
      title="No access yet"
      subTitle="Your account doesn't have access to any module yet. Contact your administrator."
    />
  );
}

// Extra permissions that also open a page beyond what its sidebar entry
// lists - Call Center has no "Leads" item, but reaches a lead's full detail
// at /leads?leadId=... from global search and the activity calendar.
const EXTRA_ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/leads": ["leads.queue_view"],
};

// Opening a page by URL follows the same rule as the sidebar: if the menu
// would hide it from you, you get a clear "no access" screen instead of a
// half-loaded page firing requests that the server refuses (each one
// popping a red "Failed to load..." toast). The backend still enforces
// every request on its own - this is about not showing a broken page.
function Gate({ path, children }: { path: string; children: React.ReactElement }) {
  const hasPermission = useHasPermission();
  const leaf = ALL_NAV_LEAVES.find((item) => item.path === path);
  const allowed = [...(leaf?.permissions ?? []), ...(EXTRA_ROUTE_PERMISSIONS[path] ?? [])];
  if (allowed.length > 0 && !allowed.some((p) => hasPermission(p))) {
    return <Result status="403" title="No access" subTitle="You don't have access to this page. Contact your administrator if you need it." />;
  }
  return children;
}

function App() {
  return (
    <ConfigProvider theme={appTheme} getPopupContainer={() => document.body}>
      <AntApp>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/f/:code"
            element={
              <Suspense fallback={<PageLoading />}>
                <QrCapturePage />
              </Suspense>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardRoute />} />
              <Route path="/leads" element={<Gate path="/leads"><LeadsPage /></Gate>} />
              <Route path="/opportunities" element={<Gate path="/opportunities"><OpportunitiesPage /></Gate>} />
              <Route path="/quotes" element={<Gate path="/quotes"><QuotesPage /></Gate>} />
              <Route path="/sales-force-management" element={<Gate path="/sales-force-management"><SalesForceManagementPage /></Gate>} />
              <Route path="/fofo-onboarding" element={<Gate path="/fofo-onboarding"><FofoOnboardingPage /></Gate>} />
              <Route path="/fofo-onboarding/:leadId" element={<Gate path="/fofo-onboarding"><FofoOnboardingPage /></Gate>} />
              <Route path="/reports" element={<Gate path="/reports"><ReportsPage /></Gate>} />
              <Route path="/leave" element={<Gate path="/leave"><LeavePage /></Gate>} />
              <Route path="/expenses" element={<Gate path="/expenses"><ExpensesPage /></Gate>} />
              <Route path="/activity-calendar" element={<Gate path="/activity-calendar"><ActivityCalendarPage /></Gate>} />
              <Route path="/approvals" element={<Gate path="/approvals"><ApprovalsPage /></Gate>} />
              <Route path="/audit-consent" element={<Gate path="/audit-consent"><AuditConsentPage /></Gate>} />
              <Route path="/team/dashboard" element={<Gate path="/team/dashboard"><TeamDashboardPage /></Gate>} />
              <Route path="/settings" element={<Gate path="/settings"><SettingsPage /></Gate>} />
              <Route path="/customers" element={<Gate path="/customers"><CustomersPage /></Gate>} />
              <Route path="/call-center" element={<Gate path="/call-center"><CallCenterPage /></Gate>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
