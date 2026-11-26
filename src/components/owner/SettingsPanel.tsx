"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatMinuteOfDay } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Settings = {
  name: string;
  city: string;
  address: string;
  chairs: number;
  openMinute: number;
  closeMinute: number;
  gstPercent: number;
  gstin: string;
  upiVpa: string;
  googleReviewUrl: string;
  followUpOffer: string;
  isDemo: boolean;
};

const HOURS = Array.from({ length: 48 }, (_, i) => ({ value: String(i * 30), label: formatMinuteOfDay(i * 30) }));

export function SettingsPanel() {
  const { data } = useLive<Settings>("/api/owner/settings", 600_000);
  return data ? <SettingsForm initial={data} /> : <Text>Loading…</Text>;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  async function save() {
    try {
      const body = s;
      await postJson("/api/owner/settings", {
        name: body.name,
        city: body.city,
        address: body.address,
        chairs: body.chairs,
        openMinute: body.openMinute,
        closeMinute: body.closeMinute,
        gstPercent: body.gstPercent,
        gstin: body.gstin,
        upiVpa: body.upiVpa,
        googleReviewUrl: body.googleReviewUrl,
        followUpOffer: body.followUpOffer,
      });
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <VStack gap={4} maxWidth={640}>
      {msg && <Banner status={msg.ok ? "success" : "error"} title={msg.text} />}
      <Heading level={2}>Salon settings</Heading>
      <TextInput label="Salon name" value={s.name} onChange={(v) => set("name", v)} />
      <TextInput label="City" value={s.city} onChange={(v) => set("city", v)} />
      <TextInput label="Address" value={s.address} onChange={(v) => set("address", v)} />
      <NumberInput label="Chairs" description="Used for chair utilisation." value={s.chairs} isIntegerOnly min={1} max={50} onChange={(v) => set("chairs", v)} />
      <HStack gap={3} wrap="wrap">
        <Selector label="Opens" options={HOURS} value={String(s.openMinute)} onChange={(v) => v && set("openMinute", Number(v))} width={140} />
        <Selector label="Closes" options={HOURS} value={String(s.closeMinute)} onChange={(v) => v && set("closeMinute", Number(v))} width={140} />
        <Selector label="GST" options={["0", "5", "12", "18"].map((g) => ({ value: g, label: `${g}%` }))} value={String(s.gstPercent)} onChange={(v) => v && set("gstPercent", Number(v))} width={120} />
      </HStack>
      <TextInput label="GSTIN" value={s.gstin} onChange={(v) => set("gstin", v)} isOptional />
      <TextInput label="UPI ID for payment links" value={s.upiVpa} onChange={(v) => set("upiVpa", v)} placeholder="salonname@okbank" isOptional />
      <TextInput label="Google review link" type="url" value={s.googleReviewUrl} onChange={(v) => set("googleReviewUrl", v)} description="Happy clients (4-5 stars) are sent here." isOptional />
      <TextInput label="Follow-up nudge offer" value={s.followUpOffer} onChange={(v) => set("followUpOffer", v)} description="Added to the one follow-up nudge, 7 days after the first." isOptional />
      <HStack>
        <Button label="Save settings" variant="primary" onClick={save} />
      </HStack>
      {s.isDemo && (
        <Card variant="muted">
          <VStack gap={2}>
            <Heading level={3}>Demo data</Heading>
            <Text color="secondary">Put the demo salon back to its starting state. Signs you out.</Text>
            <HStack>
              <Button
                label="Reset demo"
                variant="destructive"
                clickAction={async () => {
                  await postJson("/api/owner/demo-reset");
                  router.push("/login");
                }}
              />
            </HStack>
          </VStack>
        </Card>
      )}
    </VStack>
  );
}
