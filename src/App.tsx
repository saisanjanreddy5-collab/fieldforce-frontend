import { Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, ConfigProvider, Result } from "antd";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import QuotesPage from "./pages/QuotesPage";
import SalesForceManagementPage from "./pages/SalesForceManagementPage";
import FofoOnboardingPage from "./pages/FofoOnboardingPage";
import ReportsPage from "./pages/ReportsPage";
import LeavePage from "./pages/LeavePage";
import ExpensesPage from "./pages/ExpensesPage";
import ActivityCalendarPage from "./pages/ActivityCalendarPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import AuditConsentPage from "./pages/AuditConsentPage";
import TeamDashboardPage from "./pages/TeamDashboardPage";
import SettingsPage from "./pages/SettingsPage";
import CustomersPage from "./pages/CustomersPage";
import CallCenterPage from "./pages/CallCenterPage";
import QrCapturePage from "./pages/QrCapturePage";
import ComingSoonPage from "./pages/ComingSoonPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { ALL_NAV_LEAVES } from "./components/nav-config";
import { appTheme } from "./utils/design-system";
import { useHasPermission } from "./hooks/use-permission";

// "/" is also this app's catch-all redirect target (see the final Route
// below), so a plain permission check here can't just redirect to "/" on
// failure the way every other permission-based redirect in this app does -
// that would loop forever. Falls through to whatever other built page this
// user actually has a real permission for, same OR-across-permissions rule
// nav-config.tsx already uses to decide what's visible in the sidebar, so
// this never contradicts what the sidebar itself would offer.
function DashboardRoute() {
  const hasPermission = useHasPermission();
  if (hasPermission("dashboard.view")) {
    return <DashboardPage />;
  }
  const fallback = ALL_NAV_LEAVES.find(
    (item) => item.built && item.path !== "/" && item.permissions?.some((p) => hasPermission(p))
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
          <Route path="/f/:code" element={<QrCapturePage />} />
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
              {ALL_NAV_LEAVES.filter((item) => !item.built).map((item) => (
                <Route key={item.path} path={item.path} element={<ComingSoonPage title={item.label} />} />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
