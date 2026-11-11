import { useEffect, useState } from "react";
import { Col, Row, Typography, message } from "antd";
import { useAuth } from "../context/AuthContext";
import * as dashboardApi from "../api/dashboard-api";
import type { OverviewStats, PipelineStageStat } from "../types/dashboard";
import type { Activity } from "../types/activity";
import { StatsRow } from "../components/StatsRow";
import { PipelineByStageChart } from "../components/PipelineByStageChart";
import { MyDayList } from "../components/MyDayList";
import { formatCompactNumber, formatCurrency, formatPercent } from "../utils/format";
import { appTokens } from "../utils/design-system";

const { Title, Text } = Typography;

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStageStat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Promise.all([dashboardApi.getOverview(), dashboardApi.getPipelineByStage(), dashboardApi.getMyActivities(user.id)])
      .then(([overviewData, pipelineData, activityData]) => {
        setOverview(overviewData);
        setPipeline(pipelineData);
        setActivities(activityData);
      })
      .catch(() => {
        message.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 2, letterSpacing: -0.3, color: appTokens.textPrimary }}>
        Good {timeOfDayGreeting()}, {user?.name}
      </Title>
      <Text style={{ color: appTokens.textSecondary, fontSize: 13.5 }}>Here's what's happening across your pipeline today</Text>

      <div style={{ marginTop: 20 }}>
        <StatsRow
          loading={loading}
          stats={[
            { label: "Open leads", value: overview ? formatCompactNumber(overview.totalLeads) : "-" },
            { label: "Pipeline value", value: overview ? formatCurrency(overview.pipelineValue) : "-" },
            { label: "Conversion (30d)", value: overview ? formatPercent(overview.conversionRate30d) : "-" },
            { label: "Active team members", value: overview ? formatCompactNumber(overview.activeTeamMembersCount) : "-" },
          ]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <PipelineByStageChart data={pipeline} loading={loading} />
        </Col>
        <Col xs={24} lg={8}>
          <MyDayList activities={activities} loading={loading} />
        </Col>
      </Row>
    </div>
  );
}
