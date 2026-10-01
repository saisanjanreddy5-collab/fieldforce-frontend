import { useEffect, useRef, useState } from "react";
import { Input, Spin, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import * as globalSearchApi from "../api/global-search-api";
import type { GlobalSearchResult } from "../types/global-search";
import { formatCompactCurrency } from "../utils/lead-format";
import { appTokens } from "../utils/design-system";
import { CATEGORY_COLORS } from "./opportunities/stages";

const { Text } = Typography;

// A real, built search across leads and opportunities - was previously a
// disabled placeholder Input with no functionality behind it at all. Every
// result row is a record the real /leads and /opportunities endpoints
// would already show this same user, just surfaced from one box instead of
// two separate pages.
//
// Built as a plain Input + a hand-positioned dropdown, not antd's
// AutoComplete "customize input" mode - that mode doubled this box's
// height to 72px (confirmed by measuring the live DOM: the nested
// .ant-input-affix-wrapper and <input> both rendered at 58px inside a
// 72px .ant-select root) instead of matching the 36px every other control
// on this header uses, and fighting that with CSS overrides would be more
// fragile than just owning the dropdown directly.
export function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      globalSearchApi
        .globalSearch(value.trim())
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 300);
  };

  const goToLead = (id: string) => {
    setOpen(false);
    setQuery("");
    setResult(null);
    navigate(`/leads?leadId=${id}`);
  };

  const goToOpportunity = (id: string) => {
    setOpen(false);
    setQuery("");
    setResult(null);
    navigate(`/opportunities?opportunityId=${id}`);
  };

  const hasResults = Boolean(result && (result.leads.length > 0 || result.opportunities.length > 0));
  const showPanel = open && query.trim().length >= 2;

  return (
    // lineHeight: "normal" is load-bearing, not decoration - AntD derives
    // Layout.Header's own line-height from our controlHeight token
    // (72px = controlHeight 36 x 2, used to vertically-center the header's
    // single-line content), and line-height is an inherited CSS property.
    // Every plain, unstyled div rendered directly inside <Header> - the
    // Input and every dropdown row here - inherited that 72px line-height
    // and had its own line box inflated to match, which is what made both
    // the search box and its result rows render far taller than intended.
    // Resetting it here breaks the inheritance chain at the one place this
    // component sits directly inside the Header.
    <div ref={containerRef} style={{ position: "relative", maxWidth: 380, width: "100%", margin: "0 24px", lineHeight: "normal" }}>
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        prefix={<SearchOutlined style={{ color: appTokens.textTertiary }} />}
        suffix={loading ? <Spin size="small" /> : null}
        placeholder="Search leads, opportunities, contacts"
        style={{ background: appTokens.surfaceMuted }}
      />

      {showPanel && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 420,
            overflowY: "auto",
            background: appTokens.surface,
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            boxShadow: appTokens.shadowLg,
            zIndex: 1100,
            padding: "6px 0",
          }}
        >
          {!hasResults && !loading && (
            <div style={{ padding: "16px 16px" }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                No leads or opportunities match "{query}"
              </Text>
            </div>
          )}

          {result && result.leads.length > 0 && (
            <div>
              <div style={{ padding: "6px 14px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  Leads
                </Text>
              </div>
              {result.leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => goToLead(lead.id)}
                  className="lead-row"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
                      {lead.fullName}
                    </Text>
                    <div>
                      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>
                        {[lead.companyName, lead.phone].filter(Boolean).join(" · ") || "-"}
                      </Text>
                    </div>
                  </div>
                  {lead.category && (
                    <Tag color={CATEGORY_COLORS[lead.category] ?? "default"} style={{ margin: 0, flexShrink: 0 }}>
                      {lead.category}
                    </Tag>
                  )}
                </div>
              ))}
            </div>
          )}

          {result && result.opportunities.length > 0 && (
            <div>
              <div style={{ padding: "6px 14px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, color: appTokens.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  Opportunities
                </Text>
              </div>
              {result.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => goToOpportunity(opp.id)}
                  className="lead-row"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, color: appTokens.textPrimary }}>
                      {opp.name}
                    </Text>
                    <div>
                      <Text style={{ fontSize: 11.5, color: appTokens.textTertiary }}>{opp.leadFullName}</Text>
                    </div>
                  </div>
                  <Text style={{ fontSize: 12, color: appTokens.textSecondary, flexShrink: 0 }}>{formatCompactCurrency(opp.value)}</Text>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
