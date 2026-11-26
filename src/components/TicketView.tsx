"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { postJson, useLive } from "@/lib/live";
import { SalonTitle } from "./Brand";

interface Ticket {
  salonName: string;
  isDemo: boolean;
  ticketNo: number;
  firstName: string;
  serviceName: string;
  status: "waiting" | "in_chair" | "done" | "left";
  position: number | null;
  etaMin: number | null;
  stylistName: string | null;
  marketingOptIn: boolean;
  now: number;
}

const STATUS = {
  waiting: { label: "Waiting", variant: "warning" },
  in_chair: { label: "In the chair", variant: "success" },
  done: { label: "Done", variant: "neutral" },
  left: { label: "Left the queue", variant: "neutral" },
} as const;

export function TicketView({ qr, token }: { qr: string; token: string }) {
  const { data, error, refresh } = useLive<Ticket>(`/api/public/${qr}/ticket/${token}`, 4000);
  const [msg, setMsg] = useState<string>();

  async function act(url: string, body: unknown, done: string) {
    try {
      await postJson(url, body);
      setMsg(done);
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Layout
      height="auto"
      contentWidth={480}
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={5}>
            {data && <SalonTitle name={data.salonName} isDemo={data.isDemo} />}
            {error && <Banner status="error" title={error} />}
            {data && (
              <>
                <Card elevation="low">
                  <VStack gap={3} hAlign="center">
                    <HStack gap={2} vAlign="center">
                      <StatusDot variant={STATUS[data.status].variant} label={STATUS[data.status].label} isPulsing={data.status === "waiting"} />
                      <Text type="label">{STATUS[data.status].label}</Text>
                    </HStack>
                    <Text color="secondary">Hi {data.firstName}, your ticket</Text>
                    <Heading level={1} type="display-1">#{data.ticketNo}</Heading>
                    <Text>{data.serviceName}</Text>
                    {data.status === "waiting" && data.position !== null && (
                      <VStack gap={1} hAlign="center">
                        <Heading level={2}>{data.position === 1 ? "You are next" : `${data.position}th in line`.replace(/^2th/, "2nd").replace(/^3th/, "3rd")}</Heading>
                        <Text color="secondary">About {data.etaMin} min. We will WhatsApp you when it is nearly your turn.</Text>
                      </VStack>
                    )}
                    {data.status === "in_chair" && <Text>You are with {data.stylistName ?? "your stylist"}. Enjoy!</Text>}
                    {data.status === "done" && <Text>Thanks for visiting. Your bill and a quick rating link are on WhatsApp.</Text>}
                  </VStack>
                </Card>
                <Text type="supporting" color="secondary" justify="center">This page updates by itself. Keep it open.</Text>
                {msg && <Banner status="info" title={msg} />}
                <VStack gap={2}>
                  {data.status === "waiting" && (
                    <Button label="Leave the queue" variant="secondary" onClick={() => act(`/api/public/${qr}/ticket/${token}/leave`, {}, "You have left the queue.")} />
                  )}
                  {data.marketingOptIn ? (
                    <Button label="Stop offers and reminders" variant="ghost" onClick={() => act(`/api/public/${qr}/optout`, { token }, "Done. You will only get messages about this visit.")} />
                  ) : (
                    <HStack gap={2} hAlign="center"><Badge label="Offers off" /></HStack>
                  )}
                </VStack>
              </>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
