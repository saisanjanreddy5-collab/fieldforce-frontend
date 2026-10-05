import whatsappLogo from "../../assets/whatsapp-logo.png";
import outlookLogo from "../../assets/outlook-logo.png";
import teamsLogo from "../../assets/teams-logo.png";

// Real brand logos (not antd's generic recolored outline glyphs) for the
// three third-party services FieldForce actually integrates with on a
// lead - WhatsApp, Outlook (email), Microsoft Teams. Used anywhere the app
// needs to show "this button does a WhatsApp/email/Teams action", so it
// reads as the real service, not an approximation of one.
interface BrandIconProps {
  size?: number;
}

export function WhatsAppLogo({ size = 16 }: BrandIconProps) {
  return <img src={whatsappLogo} alt="WhatsApp" style={{ height: size, width: "auto", display: "block" }} />;
}

export function OutlookLogo({ size = 16 }: BrandIconProps) {
  return <img src={outlookLogo} alt="Outlook" style={{ height: size, width: "auto", display: "block" }} />;
}

export function TeamsLogo({ size = 16 }: BrandIconProps) {
  return <img src={teamsLogo} alt="Microsoft Teams" style={{ height: size, width: "auto", display: "block" }} />;
}
