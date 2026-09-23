import type { ThemeConfig } from "antd";

// The app-wide design system - real tokens (colors, radius, shadows, a real
// typeface) instead of AntD's stock defaults, which is what every screen
// was rendering with before. Every hand-styled surface across the app reads
// from these same tokens instead of scattered hardcoded hex values, and the
// root ConfigProvider in App.tsx applies the same tokens to every native
// AntD control (buttons, inputs, selects, tags, popovers, modals, menus).
export const appTokens = {
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  primary: "#1354e0",
  primaryHover: "#2f68ea",
  primarySoft: "#eef3ff",
  primarySoftBorder: "#d6e2ff",
  textPrimary: "rgba(15,23,42,0.92)",
  textSecondary: "#697386",
  textTertiary: "#9aa2b1",
  border: "#e5e7eb",
  borderLight: "#eef0f3",
  surface: "#ffffff",
  surfaceMuted: "#f8f9fb",
  surfaceSunken: "#f4f5f7",
  radiusSm: 7,
  radius: 10,
  radiusLg: 14,
  shadowXs: "0 1px 2px rgba(16,24,40,0.04)",
  shadowSm: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
  shadowMd: "0 4px 12px rgba(16,24,40,0.08)",
  shadowLg: "0 12px 32px rgba(16,24,40,0.12)",
  success: "#12a150",
  warning: "#dc8a00",
  danger: "#e0393e",
  purple: "#6d4ecf",
  sidebarBg: "#0b1120",
  sidebarBgActive: "#1354e0",
};

// Deterministic per-name gradient avatar backgrounds - richer than a single
// flat brand-blue square everywhere, used anywhere a person/lead/store gets
// an avatar across the app.
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #1354e0, #3f6fef)",
  "linear-gradient(135deg, #6d4ecf, #9b7ff0)",
  "linear-gradient(135deg, #0e9f6e, #34d399)",
  "linear-gradient(135deg, #dc8a00, #f6ad3c)",
  "linear-gradient(135deg, #e0393e, #f4716f)",
  "linear-gradient(135deg, #0284c7, #38bdf8)",
  "linear-gradient(135deg, #be185d, #ec4899)",
];

export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export const appTheme: ThemeConfig = {
  token: {
    fontFamily: appTokens.font,
    colorPrimary: appTokens.primary,
    colorPrimaryHover: appTokens.primaryHover,
    colorLink: appTokens.primary,
    colorText: appTokens.textPrimary,
    colorTextSecondary: appTokens.textSecondary,
    colorTextTertiary: appTokens.textTertiary,
    colorBorder: appTokens.border,
    colorBorderSecondary: appTokens.borderLight,
    colorBgLayout: appTokens.surfaceSunken,
    borderRadius: appTokens.radiusSm,
    borderRadiusLG: appTokens.radius,
    borderRadiusSM: 6,
    controlHeight: 36,
    boxShadow: appTokens.shadowSm,
    boxShadowSecondary: appTokens.shadowMd,
    fontSize: 14,
    colorSuccess: appTokens.success,
    colorWarning: appTokens.warning,
    colorError: appTokens.danger,
    fontWeightStrong: 600,
  },
  components: {
    Button: {
      controlHeight: 36,
      borderRadius: 8,
      fontWeight: 500,
      primaryShadow: "0 1px 2px rgba(19,84,224,0.16)",
    },
    Input: { controlHeight: 36, borderRadius: 8 },
    InputNumber: { controlHeight: 36, borderRadius: 8 },
    Select: { controlHeight: 36, borderRadius: 8 },
    DatePicker: { controlHeight: 36, borderRadius: 8 },
    Tag: { borderRadiusSM: 6, defaultBg: appTokens.surfaceMuted },
    Popover: { borderRadiusLG: 12, boxShadowSecondary: appTokens.shadowLg },
    Modal: { borderRadiusLG: 14 },
    Drawer: {},
    Progress: { defaultColor: appTokens.primary },
    Tabs: { itemSelectedColor: appTokens.primary, inkBarColor: appTokens.primary },
    Avatar: { borderRadius: 8 },
    Menu: {
      darkItemBg: "transparent",
      darkItemSelectedBg: appTokens.sidebarBgActive,
      darkItemHoverBg: "rgba(255,255,255,0.06)",
      darkSubMenuItemBg: "transparent",
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Layout: { siderBg: appTokens.sidebarBg, headerBg: appTokens.surface },
    Table: { borderRadius: 10, headerBg: appTokens.surfaceMuted },
    Card: { borderRadiusLG: appTokens.radius },
  },
};
