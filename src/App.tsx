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
import SupportTicketsPage from "./pages/SupportTicketsPage";
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
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/sales-force-management" element={<SalesForceManagementPage />} />
              <Route path="/fofo-onboarding" element={<FofoOnboardingPage />} />
              <Route path="/fofo-onboarding/:leadId" element={<FofoOnboardingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/activity-calendar" element={<ActivityCalendarPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/audit-consent" element={<AuditConsentPage />} />
              <Route path="/team/dashboard" element={<TeamDashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/support-tickets" element={<SupportTicketsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/call-center" element={<CallCenterPage />} />
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
