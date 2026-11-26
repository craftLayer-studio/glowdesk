"use client";

import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { formatIST } from "@/domain";
import { postJson, useLive } from "@/lib/live";
import { SalonTitle } from "./Brand";

interface Booking {
  salonName: string;
  isDemo: boolean;
  firstName: string;
  serviceName: string;
  stylistName: string;
  startAt: number;
  status: string;
  marketingOptIn: boolean;
}

export function BookingView({ qr, token }: { qr: string; token: string }) {
  const { data, error, refresh } = useLive<Booking>(`/api/public/${qr}/booking/${token}`, 15_000);
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
              <Card elevation="low">
                <VStack gap={2}>
                  <Text color="secondary">{data.status === "cancelled" ? "Booking cancelled" : `You're booked, ${data.firstName}`}</Text>
                  <Heading level={1}>{formatIST(data.startAt)}</Heading>
                  <Text>
                    {data.serviceName} with {data.stylistName}
                  </Text>
                  <Text type="supporting" color="secondary">Confirmation sent on WhatsApp. We remind you 2 hours before.</Text>
                </VStack>
              </Card>
            )}
            {msg && <Banner status="info" title={msg} />}
            {data?.status === "booked" && <Button label="Cancel booking" variant="secondary" onClick={() => act(`/api/public/${qr}/booking/${token}/cancel`, {}, "Booking cancelled.")} />}
            {data?.marketingOptIn && <Button label="Stop offers and reminders" variant="ghost" onClick={() => act(`/api/public/${qr}/optout`, { token }, "Done. Only booking messages from now on.")} />}
            <Button label="Back to the salon page" variant="ghost" href={`/q/${qr}`} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
