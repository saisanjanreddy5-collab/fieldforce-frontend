import { Grid } from "antd";

// The app's one phone/tablet-vs-desktop switch: below antd's `md`
// breakpoint (768px) counts as mobile. (LeadsPage deliberately uses `lg`
// instead - see its own comment.)
export function useIsMobile(): boolean {
  const screens = Grid.useBreakpoint();
  return !screens.md;
}
