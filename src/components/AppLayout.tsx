import { useState } from "react";
import { Layout, Menu, Button, Dropdown, Drawer, Grid } from "antd";
import type { MenuProps } from "antd";
import { DashboardOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const NAV_ITEMS = [{ key: "/", icon: <DashboardOutlined />, label: "Dashboard" }];

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      style={{
        height: 56,
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

  const navMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={NAV_ITEMS}
      onClick={({ key }) => {
        navigate(key);
        setMobileNavOpen(false);
      }}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileNavOpen(false)}
          open={mobileNavOpen}
          styles={{ body: { padding: 0, background: "#001529" } }}
          size={220}
        >
          <Logo collapsed={false} />
          {navMenu}
        </Drawer>
      ) : (
        <Sider collapsed={desktopCollapsed} onCollapse={setDesktopCollapsed} trigger={null}>
          <Logo collapsed={desktopCollapsed} />
          {navMenu}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => (isMobile ? setMobileNavOpen(true) : setDesktopCollapsed(!desktopCollapsed))}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.name}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
