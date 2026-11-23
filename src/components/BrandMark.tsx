// The app's name and logo, in one place - the sidebar, login page and QR
// capture page all use these, so a rename or new logo is a one-file change.
export const APP_NAME = "CRM";

// The logo sits on a white tile: its black half would vanish on the dark
// sidebar and login backgrounds.
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      <img src="/logo.png" alt={APP_NAME} style={{ width: "72%", height: "72%", objectFit: "contain", display: "block" }} />
    </div>
  );
}
