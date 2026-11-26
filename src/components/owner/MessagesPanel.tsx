"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { Table } from "@astryxdesign/core/Table";
import { formatIST, formatPhone } from "@/domain";
import { useLive } from "@/lib/live";

type Msg = { id: string; channel: string; purpose: "utility" | "marketing" | "otp"; template: string; toPhone: string; body: string; createdAt: number };

const PURPOSE = { utility: "info", marketing: "purple", otp: "neutral" } as const;

export function MessagesPanel() {
  const { data } = useLive<{ messages: Msg[] }>("/api/owner/outbox", 5000);
  return (
    <VStack gap={3}>
      <Banner status="info" title="Simulated WhatsApp and SMS" description="No messages leave this app. Every message GlowDesk would send is written here. A real WhatsApp Business provider plugs into the same adapter later." />
      <Table
        data={data?.messages ?? []}
        idKey="id"
        density="compact"
        verticalAlign="top"
        emptyState={<Text color="secondary">No messages yet.</Text>}
        columns={[
          { key: "createdAt", header: "Sent", renderCell: (m) => <Text>{formatIST(m.createdAt)}</Text> },
          { key: "toPhone", header: "To", renderCell: (m) => <VStack gap={0}><Text hasTabularNumbers>{formatPhone(m.toPhone)}</Text><Text type="supporting" color="secondary">{m.channel}</Text></VStack> },
          { key: "template", header: "Template", renderCell: (m) => <VStack gap={1}><Text>{m.template}</Text><Badge variant={PURPOSE[m.purpose]} label={m.purpose} /></VStack> },
          { key: "body", header: "Message", renderCell: (m) => <Text>{m.purpose === "otp" ? m.body.replace(/\d{6}/, "••••••") : m.body}</Text> },
        ]}
      />
    </VStack>
  );
}
