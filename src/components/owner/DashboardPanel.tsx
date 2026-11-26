"use client";

import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table } from "@astryxdesign/core/Table";
import { formatINR, formatIST, formatPercent } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Dash = {
  days: number;
  revenue: number;
  visits: number;
  todayRevenue: number;
  todayVisits: number;
  chairUtilisation: number;
  todayUtilisation: number;
  repeatRate: number;
  planSales: number;
  byStylist: { stylistId: string; name: string; visits: number; revenue: number; serviceCommission: number; salesCommission: number }[];
  nudges: { sent: number; converted: number; recoveredPaise: number; marketingMessages: number };
  reviews: { requested: number; answered: number; average: number | null; toGoogle: number; privateFeedback: { id: string; rating: number; comment: string; at: number }[] };
};

function Kpi({ label, value, note, children }: { label: string; value: string; note?: string; children?: React.ReactNode }) {
  return (
    <Card>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">{label}</Text>
        <Heading level={2} accessibilityLevel={3}>{value}</Heading>
        {children}
        {note && <Text type="supporting" color="secondary">{note}</Text>}
      </VStack>
    </Card>
  );
}

export function DashboardPanel() {
  const [days, setDays] = useState("30");
  const [summary, setSummary] = useState<string | null>(null);
  const { data } = useLive<Dash>(`/api/owner/dashboard?days=${days}`, 30_000);
  if (!data) return <Text>Loading…</Text>;
  return (
    <VStack gap={5}>
      <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
      <SegmentedControl label="Period" value={days} onChange={setDays}>
        <SegmentedControlItem value="1" label="Today" />
        <SegmentedControlItem value="7" label="7 days" />
        <SegmentedControlItem value="30" label="30 days" />
        <SegmentedControlItem value="90" label="90 days" />
      </SegmentedControl>
        <Button
          label="Send me the daily summary on WhatsApp"
          variant="secondary"
          clickAction={async () => {
            const r = await postJson<{ body: string }>("/api/owner/summary");
            setSummary(r.body);
          }}
        />
      </HStack>
      {summary && <Banner status="success" title="Summary written to the WhatsApp outbox" description={summary} isDismissable onDismiss={() => setSummary(null)} />}
      <Grid columns={{ minWidth: 220, max: 4, repeat: "fit" }} gap={3}>
        <Kpi label="Recovered revenue" value={formatINR(data.nudges.recoveredPaise)} note={`${data.nudges.converted} of ${data.nudges.sent} nudged clients came back within 14 days`} />
        <Kpi label="Revenue" value={formatINR(data.revenue)} note={`${data.visits} visits · today ${formatINR(data.todayRevenue)} from ${data.todayVisits}`} />
        <Kpi label="Chair utilisation" value={formatPercent(data.chairUtilisation)} note={`Service minutes ÷ chair minutes open · today ${formatPercent(data.todayUtilisation)}`}>
          <ProgressBar label="Chair utilisation" isLabelHidden value={Math.round(data.chairUtilisation * 100)} />
        </Kpi>
        <Kpi label="Repeat rate" value={formatPercent(data.repeatRate)} note="Clients in this period who had visited before">
          <ProgressBar label="Repeat rate" isLabelHidden value={Math.round(data.repeatRate * 100)} variant="success" />
        </Kpi>
        <Kpi label="Packages and memberships sold" value={formatINR(data.planSales)} note="Prepaid, in this period" />
        <Kpi label="Average rating" value={data.reviews.average === null ? "No ratings" : `${data.reviews.average} ★`} note={`${data.reviews.answered} of ${data.reviews.requested} answered · ${data.reviews.toGoogle} sent to Google`} />
      </Grid>
      <VStack gap={2}>
        <Heading level={2}>Revenue and commission by stylist</Heading>
        <Text type="supporting" color="secondary">Pick Today for the day-close commission report.</Text>
        <Table
          data={data.byStylist}
          idKey="stylistId"
          columns={[
            { key: "name", header: "Stylist" },
            { key: "visits", header: "Visits", align: "end" },
            { key: "revenue", header: "Revenue", align: "end", renderCell: (r) => <Text hasTabularNumbers>{formatINR(r.revenue)}</Text> },
            { key: "serviceCommission", header: "Service commission", align: "end", renderCell: (r) => <Text hasTabularNumbers>{formatINR(r.serviceCommission)}</Text> },
            { key: "salesCommission", header: "Package commission", align: "end", renderCell: (r) => <Text hasTabularNumbers>{formatINR(r.salesCommission)}</Text> },
            { key: "total", header: "Commission due", align: "end", renderCell: (r) => <Text weight="bold" hasTabularNumbers>{formatINR(r.serviceCommission + r.salesCommission)}</Text> },
          ]}
        />
      </VStack>
      <VStack gap={2}>
        <Heading level={2}>Private feedback</Heading>
        <Text type="supporting" color="secondary">Ratings of 1 to 3 stars stay here instead of going to Google. Call these clients.</Text>
        <Table
          data={data.reviews.privateFeedback}
          idKey="id"
          density="compact"
          emptyState={<Text color="secondary">No private feedback in this period.</Text>}
          columns={[
            { key: "at", header: "When", renderCell: (r) => <Text>{formatIST(r.at)}</Text> },
            { key: "rating", header: "Stars", renderCell: (r) => <Text>{"★".repeat(r.rating)}</Text> },
            { key: "comment", header: "Comment", renderCell: (r) => <Text>{r.comment || "(no comment)"}</Text> },
          ]}
        />
      </VStack>
    </VStack>
  );
}
