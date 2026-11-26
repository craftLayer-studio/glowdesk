"use client";

import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";
import { postJson, useLive } from "@/lib/live";
import { SalonTitle } from "./Brand";

interface Review {
  salonName: string;
  isDemo: boolean;
  firstName: string;
  answered: boolean;
  rating: number | null;
  route: "google" | "private" | null;
  googleUrl: string | null;
}

/** Review funnel: 4-5 stars go to Google, 1-3 stay private with the owner. */
export function ReviewView({ token }: { token: string }) {
  const { data, error, refresh } = useLive<Review>(`/api/reviews/${token}`, 600_000);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string>();
  async function submit() {
    try {
      await postJson(`/api/reviews/${token}`, { rating, comment });
      refresh();
    } catch (e) {
      setErr((e as Error).message);
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
            {(error || err) && <Banner status="error" title={error ?? err} />}
            {data && !data.answered && (
              <Card>
                <VStack gap={4}>
                  <Heading level={1}>How was your visit, {data.firstName}?</Heading>
                  <HStack gap={2} wrap="wrap">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Button key={n} label={`${n} ★`} variant={rating === n ? "primary" : "secondary"} size="lg" onClick={() => setRating(n)} />
                    ))}
                  </HStack>
                  {rating > 0 && rating < 4 && <TextArea label="What should we fix? (only the owner sees this)" value={comment} onChange={setComment} rows={4} maxLength={1000} />}
                  <Button label="Send" variant="primary" isDisabled={rating === 0} onClick={submit} />
                </VStack>
              </Card>
            )}
            {data?.answered && data.route === "google" && (
              <Card>
                <VStack gap={3}>
                  <Heading level={1}>Thank you!</Heading>
                  <Text>Would you share that on Google? It helps a small salon a lot.</Text>
                  {data.googleUrl && <Button label="Post a Google review" variant="primary" href={data.googleUrl} target="_blank" rel="noopener noreferrer" />}
                  {data.isDemo && <Text type="supporting" color="secondary">Demo: the Google link is a placeholder.</Text>}
                </VStack>
              </Card>
            )}
            {data?.answered && data.route === "private" && (
              <Card>
                <VStack gap={2}>
                  <Heading level={1}>Sorry it was not perfect</Heading>
                  <Text>Your note went straight to the owner. They may call you to make it right.</Text>
                </VStack>
              </Card>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
