import { Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { ALL_NAV_LEAVES } from "./components/nav-config";

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <AntApp>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
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
