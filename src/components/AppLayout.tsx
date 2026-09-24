import { useEffect, useState } from "react";
import { Layout, Menu, Button, Drawer, Grid, Input, Avatar, message } from "antd";
import type { MenuProps } from "antd";
import { MenuOutlined, SearchOutlined, ThunderboltFilled, UserOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_GROUPS } from "./nav-config";
import { SoftphoneWidget } from "./SoftphoneWidget";
import { ProfileDrawer } from "./ProfileDrawer";
import { appTokens, avatarGradient } from "../utils/design-system";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const MENU_ITEMS: MenuProps["items"] = NAV_GROUPS.map((group, index) => ({
  key: `group-${index}`,
  type: "group",
  label: group.groupLabel.toUpperCase(),
  children: group.items.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
  })),
}));

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        padding: collapsed ? 0 : "0 18px",
        color: "#fff",
        overflow: "hidden",
        whiteSpace: "nowrap",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${appTokens.primary}, #3f6fef)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(19,84,224,0.4)",
        }}
      >
        <ThunderboltFilled style={{ color: "#fff", fontSize: 14 }} />
      </div>
      {!collapsed && <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.2 }}>FieldForce</span>}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function AppLayout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();

  // The Microsoft OAuth round-trip lands back here (the app root) regardless
  // of which page Connect was opened from, since AppLayout is mounted for
  // every authenticated route - so this is the one place that can reliably
  // catch the outcome and react to it, whatever page the user started on.
  useEffect(() => {
    const outcome = searchParams.get("microsoft");
    if (outcome === "connected") {
      message.success("Microsoft 365 connected");
      setProfileOpen(true);
      setSearchParams({}, { replace: true });
    } else if (outcome === "error") {
      message.error(searchParams.get("reason") ?? "Failed to connect Microsoft 365");
      setProfileOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const renderNavMenu = (inlineCollapsed: boolean) => (
    <Menu
      theme="dark"
      mode="inline"
      inlineCollapsed={inlineCollapsed}
      selectedKeys={[location.pathname]}
      items={MENU_ITEMS}
      onClick={({ key }) => {
        navigate(key);
        setMobileNavOpen(false);
      }}
    />
  );

  // The window itself never scrolls - only the nav list and the main content
  // area scroll independently, each capped to its own box. This avoids the
  // "scroll chaining" problem where scrolling inside the sidebar leaks out
  // into scrolling the whole page.
  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileNavOpen(false)}
          open={mobileNavOpen}
          styles={{ body: { padding: 0, background: appTokens.sidebarBg, display: "flex", flexDirection: "column" } }}
          size={240}
        >
          <Logo collapsed={false} />
          <div
            className="scrollbar-thin"
            style={{ height: "calc(100vh - 56px)", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}
          >
            {renderNavMenu(false)}
          </div>
        </Drawer>
      ) : (
        <Sider collapsed={desktopCollapsed} onCollapse={setDesktopCollapsed} trigger={null} width={240} style={{ height: "100vh" }}>
          <Logo collapsed={desktopCollapsed} />
          <div
            className="scrollbar-thin"
            style={{ height: "calc(100vh - 56px)", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}
          >
            {renderNavMenu(desktopCollapsed)}
          </div>
        </Sider>
      )}
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            background: appTokens.surface,
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${appTokens.borderLight}`,
            boxShadow: "0 1px 3px rgba(16,24,40,0.03)",
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => (isMobile ? setMobileNavOpen(true) : setDesktopCollapsed(!desktopCollapsed))}
            />
            {/* A single, static label rather than a Sales/Onboarding/Support-style
                tab switcher - this app is just the one CRM module, there's
                nothing else to switch between. */}
            <div
              style={{
                background: appTokens.primarySoft,
                color: appTokens.primary,
                fontWeight: 700,
                fontSize: 12.5,
                lineHeight: "20px",
                padding: "4px 14px",
                borderRadius: 999,
                border: `1px solid ${appTokens.primarySoftBorder}`,
                letterSpacing: 0.3,
              }}
            >
              CRM
            </div>
          </div>

          {!isMobile && (
            <Input
              disabled
              prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
              placeholder="Search leads, opportunities, contacts"
              style={{ maxWidth: 380, margin: "0 24px", background: appTokens.surfaceMuted }}
            />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            {!isMobile && <SoftphoneWidget />}
            <div
              onClick={() => setProfileOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
            >
              <Avatar
                size={32}
                icon={!user?.name && <UserOutlined />}
                style={user?.name ? { background: avatarGradient(user.name), fontWeight: 600, fontSize: 13 } : undefined}
              >
                {user?.name ? user.name.trim().charAt(0).toUpperCase() : undefined}
              </Avatar>
              {!isMobile && (
                <div style={{ lineHeight: 1.3, textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: appTokens.textPrimary }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: appTokens.textTertiary }}>
                    {user?.designation ?? (user ? capitalize(user.role) : "")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Header>
        <Content style={{ margin: 16, overflowY: "auto", overscrollBehavior: "contain" }}>
          <Outlet />
        </Content>
      </Layout>
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Layout>
  );
}
