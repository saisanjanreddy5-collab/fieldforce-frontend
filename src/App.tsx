import { Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
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
import QrCapturePage from "./pages/QrCapturePage";
import ComingSoonPage from "./pages/ComingSoonPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { ALL_NAV_LEAVES } from "./components/nav-config";
import { appTheme } from "./utils/design-system";

function App() {
  return (
    <ConfigProvider theme={appTheme} getPopupContainer={() => document.body}>
      <AntApp>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/f/:code" element={<QrCapturePage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
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
