"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Table } from "@astryxdesign/core/Table";
import { formatIST, MAX_MARKETING_PER_30_DAYS, RECOVERY_WINDOW_DAYS } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Due = { customerId: string; customerName: string; serviceName: string; lastVisitAt: number; dueAt: number; marketingOptIn: boolean };

export function NudgesPanel() {
  const { data, refresh } = useLive<{ due: Due[]; now?: number }>("/api/owner/nudges", 60_000);
  const [msg, setMsg] = useState<string>();
  const [now] = useState(() => Date.now());
  const all = data?.due ?? [];
  const rows = all.slice(0, 50).map((d) => ({ ...d, id: `${d.customerId}-${d.serviceName}` }));
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
        <VStack gap={0.5}>
          <Heading level={2}>Clients due for their next visit</Heading>
          <Text type="supporting" color="secondary">
            Each service has a rebook cycle (Service menu tab). When it runs out, opted-in clients get a WhatsApp nudge; one follow-up after 7 days; at most {MAX_MARKETING_PER_30_DAYS} a month. A visit within {RECOVERY_WINDOW_DAYS} days counts as recovered revenue.
          </Text>
        </VStack>
        <Button
          label="Send due reminders and nudges"
          variant="primary"
          clickAction={async () => {
            const r = await postJson<{ nudges: number; reminders: number }>("/api/owner/nudges");
            setMsg(`${r.nudges} rebooking nudges and ${r.reminders} booking reminders written to the WhatsApp outbox (simulated).`);
            refresh();
          }}
        />
      </HStack>
      <Text type="supporting" color="secondary">{all.length} client-services due within 7 days{all.length > 50 ? "; showing the 50 most overdue" : ""}.</Text>
      {msg && <Banner status="success" title={msg} isDismissable onDismiss={() => setMsg(undefined)} />}
      <Table
        data={rows}
        idKey="id"
        density="compact"
        emptyState={<Text color="secondary">Nobody is due this week.</Text>}
        columns={[
          { key: "customerName", header: "Client" },
          { key: "serviceName", header: "Service" },
          { key: "lastVisitAt", header: "Last visit", renderCell: (r) => <Text>{formatIST(r.lastVisitAt)}</Text> },
          { key: "dueAt", header: "Due", renderCell: (r) => <HStack gap={2}><Text>{formatIST(r.dueAt)}</Text>{r.dueAt < now && <Badge variant="warning" label="Overdue" />}</HStack> },
          { key: "marketingOptIn", header: "Can nudge", renderCell: (r) => (r.marketingOptIn ? <Badge variant="success" label="Opted in" /> : <Badge label="No consent" />) },
        ]}
      />
    </VStack>
  );
}
