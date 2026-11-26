"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";

const STANDEES = [
  { title: "Skip the counter", line: "Scan to join the queue. See your place live on your phone.", suffix: "" },
  { title: "Book your next visit", line: "Pick your stylist and a time. No calls, no app.", suffix: "?book=1" },
];

/** Printable reception and mirror QR standees. */
export function QrSheet({ salonName, url, codes }: { salonName: string; url: string; codes: Record<string, string> }) {
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
        <VStack gap={0.5}>
          <Heading level={1}>QR sheet</Heading>
          <Text color="secondary">Print on A4 and cut. One for reception, one per mirror.</Text>
        </VStack>
        <HStack gap={2}>
          <Button label="Print" variant="primary" onClick={() => window.print()} />
          <Button label="Open link" variant="ghost" href={url} target="_blank" />
        </HStack>
      </HStack>
      <Grid columns={{ minWidth: 280, max: 2, repeat: "fit" }} gap={4}>
        {STANDEES.map((s) => (
          <Card key={s.title} padding={6} elevation="low">
            <VStack gap={3} hAlign="center">
              <Text type="label" color="secondary">{salonName}</Text>
              <Heading level={2} justify="center">{s.title}</Heading>
              <VStack width="70%">
                <AspectRatio ratio={1} fit="contain">
                  {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI, nothing to optimise */}
                  <img src={codes[s.suffix]} alt={`QR code for ${url}${s.suffix}`} />
                </AspectRatio>
              </VStack>
              <Text justify="center">{s.line}</Text>
              <Text type="supporting" color="secondary" justify="center">{`${url}${s.suffix}`.replace(/^https?:\/\//, "")}</Text>
            </VStack>
          </Card>
        ))}
      </Grid>
    </VStack>
  );
}
