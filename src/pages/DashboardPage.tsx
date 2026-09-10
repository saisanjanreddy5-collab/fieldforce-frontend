import { useEffect, useState } from "react";
import { Col, Row, Typography, message } from "antd";
import { useAuth } from "../context/AuthContext";
import * as dashboardApi from "../api/dashboard-api";
import type { OverviewStats, PipelineStageStat } from "../types/dashboard";
import type { Activity } from "../types/activity";
import { StatCard } from "../components/StatCard";
import { PipelineByStageChart } from "../components/PipelineByStageChart";
import { MyDayList } from "../components/MyDayList";
import { formatCompactNumber, formatCurrency, formatPercent } from "../utils/format";

const { Title } = Typography;

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
      <Title level={3} style={{ marginTop: 0 }}>
        Good {timeOfDayGreeting()}, {user?.name}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Open leads" value={overview ? formatCompactNumber(overview.totalLeads) : "-"} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Pipeline value" value={overview ? formatCurrency(overview.pipelineValue) : "-"} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Conversion (30d)" value={overview ? formatPercent(overview.conversionRate30d) : "-"} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Active team members"
            value={overview ? formatCompactNumber(overview.activeTeamMembersCount) : "-"}
            loading={loading}
          />
        </Col>
      </Row>

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
