import { useState } from "react";
import { Layout, Menu, Button, Dropdown, Drawer, Grid } from "antd";
import type { MenuProps } from "antd";
import { LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_GROUPS } from "./nav-config";
import { SoftphoneWidget } from "./SoftphoneWidget";

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
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      {collapsed ? "FF" : "FieldForce"}
    </div>
  );
}

export function AppLayout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const userMenuItems: MenuProps["items"] = [
    { key: "logout", icon: <LogoutOutlined />, label: "Log out", onClick: logout },
  ];

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
          styles={{ body: { padding: 0, background: "#001529", display: "flex", flexDirection: "column" } }}
          size={240}
        >
          <Logo collapsed={false} />
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
            {renderNavMenu(false)}
          </div>
        </Drawer>
      ) : (
        <Sider
          collapsed={desktopCollapsed}
          onCollapse={setDesktopCollapsed}
          trigger={null}
          width={240}
          style={{ height: "100vh", display: "flex", flexDirection: "column" }}
        >
          <Logo collapsed={desktopCollapsed} />
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
            {renderNavMenu(desktopCollapsed)}
          </div>
        </Sider>
      )}
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => (isMobile ? setMobileNavOpen(true) : setDesktopCollapsed(!desktopCollapsed))}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isMobile && <SoftphoneWidget />}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />}>
                {user?.name}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 16, overflowY: "auto", overscrollBehavior: "contain" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
