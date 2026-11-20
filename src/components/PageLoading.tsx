import { Spin } from "antd";

// Shown while a page's code downloads the first time it is opened (pages are
// loaded on demand - see App.tsx). The short delay keeps fast loads from
// flashing a spinner at all.
export function PageLoading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
      <Spin delay={200} />
    </div>
  );
}
