"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR, formatMinuteOfDay, formatTimeIST, istDate } from "@/domain";
import { postJson, useLive } from "@/lib/live";
import { ConsentFields } from "./ConsentFields";
import { SalonTitle } from "./Brand";

interface Salon {
  salon: { name: string; city: string; address: string; openMinute: number; closeMinute: number; isDemo: boolean; gstPercent: number };
  services: { id: string; name: string; category: string; gender: string; pricePaise: number; durationMin: number }[];
  stylists: { id: string; name: string; title: string }[];
  packages: { id: string; name: string; sessions: number; pricePaise: number; validityDays: number }[];
  memberships: { id: string; name: string; pricePaise: number; walletCreditPaise: number; discountPercent: number }[];
  queue: { waiting: number; etaMin: number };
}

type Mode = "queue" | "book" | "menu";
type ISODate = ISODateString;

function ContactFields(p: { name: string; phone: string; setName: (v: string) => void; setPhone: (v: string) => void }) {
  return (
    <>
      <TextInput label="Your name" value={p.name} onChange={p.setName} autoComplete="name" isRequired />
      <TextInput label="Mobile number" type="tel" inputMode="tel" value={p.phone} onChange={p.setPhone} placeholder="98765 43210" autoComplete="tel" isRequired />
    </>
  );
}

export function CustomerApp({ qr }: { qr: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { data, error: loadError } = useLive<Salon & { now?: number }>(`/api/public/${qr}`, 10_000);
  const [mode, setMode] = useState<Mode>(search.get("service") || search.get("book") ? "book" : "queue");
  const [serviceId, setServiceId] = useState<string | null>(search.get("service"));
  const [stylistId, setStylistId] = useState<string | null>(null);
  const [bounds] = useState(() => ({ min: istDate(Date.now()) as ISODate, max: istDate(Date.now() + 60 * 86_400_000) as ISODate }));
  const [date, setDate] = useState<ISODate>(bounds.min);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceUpdates, setServiceUpdates] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const serviceOptions = useMemo(
    () => (data?.services ?? []).map((s) => ({ value: s.id, label: s.name, description: `${formatINR(s.pricePaise)} · ${s.durationMin} min` })),
    [data],
  );
  const stylistOptions = useMemo(() => (data?.stylists ?? []).map((s) => ({ value: s.id, label: s.name, description: s.title })), [data]);

  useEffect(() => {
    if (mode !== "book" || !serviceId || !stylistId || !date) return;
    let alive = true;
    fetch(`/api/public/${qr}/slots?serviceId=${encodeURIComponent(serviceId)}&stylistId=${encodeURIComponent(stylistId)}&date=${date}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setSlot(null);
        if (Array.isArray(j.slots)) {
          setSlots(j.slots);
          setError(undefined);
        } else {
          setSlots([]);
          setError(j.error);
        }
      })
      .catch(() => alive && setError("Could not load free times"));
    return () => {
      alive = false;
    };
  }, [qr, mode, serviceId, stylistId, date]);

  async function join() {
    setError(undefined);
    if (!serviceId) return setError("Pick a service");
    setBusy(true);
    try {
      const res = await postJson<{ ticketToken: string }>(`/api/public/${qr}/queue`, {
        name,
        phone,
        serviceId,
        preferredStylistId: stylistId ?? undefined,
        consentServiceUpdates: serviceUpdates,
        consentMarketing: marketing,
      });
      router.push(`/q/${qr}/t/${res.ticketToken}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function book() {
    setError(undefined);
    if (!serviceId || !stylistId || slot === null) return setError("Pick a service, stylist and time");
    setBusy(true);
    try {
      const res = await postJson<{ bookingToken: string }>(`/api/public/${qr}/book`, {
        name,
        phone,
        serviceId,
        stylistId,
        startAt: slot,
        consentServiceUpdates: serviceUpdates,
        consentMarketing: marketing,
      });
      router.push(`/q/${qr}/b/${res.bookingToken}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (loadError && !data) {
    return (
      <Layout content={<LayoutContent role="main" padding={4}><Banner status="error" title={loadError} /></LayoutContent>} />
    );
  }

  return (
    <Layout
      height="auto"
      contentWidth={560}
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={5}>
            <VStack gap={1}>
              {data ? <SalonTitle name={data.salon.name} isDemo={data.salon.isDemo} /> : <Text>Loading…</Text>}
              {data && (
                <Text type="supporting" color="secondary">
                  {data.salon.address} · Open {formatMinuteOfDay(data.salon.openMinute)} to {formatMinuteOfDay(data.salon.closeMinute)}
                </Text>
              )}
            </VStack>
            {data && (
              <Card variant="muted">
                <HStack gap={4} hAlign="between" vAlign="center">
                  <VStack gap={0.5}>
                    <Text type="supporting" color="secondary">Waiting now</Text>
                    <Heading level={2} accessibilityLevel={2}>{data.queue.waiting} {data.queue.waiting === 1 ? "person" : "people"}</Heading>
                  </VStack>
                  <VStack gap={0.5} hAlign="end">
                    <Text type="supporting" color="secondary">Estimated wait</Text>
                    <Heading level={2} accessibilityLevel={2}>{data.queue.etaMin === 0 ? "No wait" : `~${data.queue.etaMin} min`}</Heading>
                  </VStack>
                </HStack>
              </Card>
            )}
            <SegmentedControl label="What would you like to do" value={mode} onChange={(v) => setMode(v as Mode)} layout="fill" size="lg">
              <SegmentedControlItem value="queue" label="Join queue" />
              <SegmentedControlItem value="book" label="Book a slot" />
              <SegmentedControlItem value="menu" label="Menu" />
            </SegmentedControl>

            {error && <Banner status="error" title={error} />}

            {mode === "queue" && (
              <VStack gap={4}>
                <Selector label="Service" options={serviceOptions} value={serviceId ?? undefined} onChange={setServiceId} placeholder="Pick a service" presentation="adaptive" />
                <Selector label="Preferred stylist" options={stylistOptions} value={stylistId} onChange={setStylistId} hasClear placeholder="Any stylist" isOptional presentation="adaptive" />
                <ContactFields name={name} phone={phone} setName={setName} setPhone={setPhone} />
                <ConsentFields purpose="queue" serviceUpdates={serviceUpdates} marketing={marketing} onServiceUpdates={setServiceUpdates} onMarketing={setMarketing} />
                <Button label="Join the queue" variant="primary" size="lg" isLoading={busy} onClick={join} />
              </VStack>
            )}

            {mode === "book" && (
              <VStack gap={4}>
                <Selector label="Service" options={serviceOptions} value={serviceId ?? undefined} onChange={setServiceId} placeholder="Pick a service" presentation="adaptive" />
                <Selector label="Stylist" options={stylistOptions} value={stylistId ?? undefined} onChange={setStylistId} placeholder="Pick a stylist" presentation="adaptive" />
                <DateInput label="Date" value={date} onChange={(v) => v && setDate(v)} min={bounds.min} max={bounds.max} weekStartsOn="mon" />
                {serviceId && stylistId && (
                  <VStack gap={2}>
                    <Text type="label">Free times</Text>
                    {slots === null ? (
                      <Text color="secondary">Loading…</Text>
                    ) : slots.length === 0 ? (
                      <Text color="secondary">No free times that day. Try another date or stylist.</Text>
                    ) : (
                      <Grid columns={{ minWidth: 88, repeat: "fill" }} gap={2}>
                        {slots.map((s) => (
                          <Button key={s} label={formatTimeIST(s)} size="sm" variant={slot === s ? "primary" : "secondary"} onClick={() => setSlot(s)} />
                        ))}
                      </Grid>
                    )}
                  </VStack>
                )}
                <ContactFields name={name} phone={phone} setName={setName} setPhone={setPhone} />
                <ConsentFields purpose="booking" serviceUpdates={serviceUpdates} marketing={marketing} onServiceUpdates={setServiceUpdates} onMarketing={setMarketing} />
                <Button label="Confirm booking" variant="primary" size="lg" isLoading={busy} isDisabled={slot === null} onClick={book} />
              </VStack>
            )}

            {mode === "menu" && data && (
              <VStack gap={4}>
                <Table
                  data={data.services}
                  idKey="id"
                  density="compact"
                  columns={[
                    { key: "name", header: "Service", renderCell: (s) => <VStack gap={0}><Text>{s.name}</Text><Text type="supporting" color="secondary">{s.category} · {s.durationMin} min</Text></VStack> },
                    { key: "pricePaise", header: "Price", align: "end", renderCell: (s) => <Text hasTabularNumbers>{formatINR(s.pricePaise)}</Text> },
                  ]}
                />
                <Text type="supporting" color="secondary">Prices exclude {data.salon.gstPercent}% GST.</Text>
                {(data.packages.length > 0 || data.memberships.length > 0) && (
                  <VStack gap={2}>
                    <Heading level={3} accessibilityLevel={2}>Packages and memberships</Heading>
                    <Text type="supporting" color="secondary">Ask at reception to buy one.</Text>
                    <Table
                      data={[
                        ...data.packages.map((p) => ({ id: p.id, name: p.name, detail: `${p.sessions} sessions, valid ${p.validityDays} days`, price: p.pricePaise })),
                        ...data.memberships.map((m) => ({ id: m.id, name: m.name, detail: `${formatINR(m.walletCreditPaise)} wallet credit + ${m.discountPercent}% off services`, price: m.pricePaise })),
                      ]}
                      idKey="id"
                      density="compact"
                      columns={[
                        { key: "name", header: "Plan", renderCell: (r) => <VStack gap={0}><Text>{r.name}</Text><Text type="supporting" color="secondary">{r.detail}</Text></VStack> },
                        { key: "price", header: "Price", align: "end", renderCell: (r) => <Text hasTabularNumbers>{formatINR(r.price)}</Text> },
                      ]}
                    />
                  </VStack>
                )}
              </VStack>
            )}
            <Text type="supporting" color="secondary">Powered by GlowDesk · No app needed</Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
