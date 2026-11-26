"use client";

import { useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table, pixel } from "@astryxdesign/core/Table";
import { formatPhone, formatTimeIST } from "@/domain";
import { postJson, useLive } from "@/lib/live";
import { CheckoutDialog, type CheckoutTarget } from "./CheckoutDialog";
import { ClientsPanel } from "./ClientsPanel";
import { NewClientDialog } from "./NewClientDialog";

export interface Floor {
  now: number;
  salon: { name: string; qrToken: string; isDemo: boolean };
  queue: {
    id: string;
    ticketNo: number;
    status: "waiting" | "in_chair";
    position: number | null;
    customerId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    serviceName: string;
    durationMin: number;
    preferredStylist: string | null;
    stylistId: string | null;
    stylistName: string | null;
    joinedAt: number;
  }[];
  appointments: {
    id: string;
    status: "booked" | "checked_in" | "completed" | "cancelled" | "no_show";
    startAt: number;
    endAt: number;
    customerId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    serviceName: string;
    stylistId: string;
    stylistName: string;
    source: string;
  }[];
  stylists: { id: string; name: string; title: string }[];
  services: { id: string; name: string; pricePaise: number; durationMin: number; category: string }[];
}

const APPT_BADGE = {
  booked: { label: "Booked", variant: "info" },
  checked_in: { label: "Checked in", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  no_show: { label: "No-show", variant: "error" },
} as const;

export function StaffApp() {
  const { data, error, refresh } = useLive<Floor>("/api/staff/floor", 3000);
  const [tab, setTab] = useState("queue");
  const [pick, setPick] = useState<Record<string, string | null>>({});
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const [dialog, setDialog] = useState<"walkin" | "book" | null>(null);
  const [msg, setMsg] = useState<string>();

  const stylistOptions = useMemo(() => (data?.stylists ?? []).map((s) => ({ value: s.id, label: s.name })), [data]);

  async function act(url: string, body: unknown) {
    setMsg(undefined);
    try {
      await postJson(url, body);
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!data) return error ? <Banner status="error" title={error} /> : <Text>Loading…</Text>;
  const waiting = data.queue.filter((q) => q.status === "waiting");
  const inChair = data.queue.filter((q) => q.status === "in_chair");
  const upcoming = data.appointments.filter((a) => a.status === "booked" || a.status === "checked_in");

  return (
    <VStack gap={5}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
        <VStack gap={0.5}>
          <Heading level={1}>{data.salon.name}</Heading>
          <Text color="secondary">Front desk · live, refreshes every few seconds</Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button label="Add walk-in" variant="primary" onClick={() => setDialog("walkin")} />
          <Button label="Book by phone" onClick={() => setDialog("book")} />
          <Button label="Open customer QR page" variant="ghost" href={`/q/${data.salon.qrToken}`} target="_blank" />
        </HStack>
      </HStack>
      <Grid columns={{ minWidth: 160, max: 4, repeat: "fit" }} gap={3}>
        <Card><VStack gap={1}><Text type="supporting" color="secondary">Waiting</Text><Heading level={2}>{waiting.length}</Heading></VStack></Card>
        <Card><VStack gap={1}><Text type="supporting" color="secondary">In the chair</Text><Heading level={2}>{inChair.length}</Heading></VStack></Card>
        <Card><VStack gap={1}><Text type="supporting" color="secondary">Bookings left today</Text><Heading level={2}>{upcoming.length}</Heading></VStack></Card>
        <Card><VStack gap={1}><Text type="supporting" color="secondary">Stylists on floor</Text><Heading level={2}>{data.stylists.length}</Heading></VStack></Card>
      </Grid>
      {msg && <Banner status="error" title={msg} isDismissable onDismiss={() => setMsg(undefined)} />}
      <TabList value={tab} onChange={setTab} hasDivider>
        <Tab value="queue" label={`Walk-in queue (${data.queue.length})`} />
        <Tab value="diary" label={`Today's bookings (${data.appointments.length})`} />
        <Tab value="clients" label="Clients" />
      </TabList>

      {tab === "queue" && (
        <Table
          data={data.queue}
          idKey="id"
          hasHover
          emptyState={<Text color="secondary">Nobody waiting. The QR at reception adds people here.</Text>}
          columns={[
            { key: "ticketNo", header: "Ticket", width: pixel(80), renderCell: (q) => <Text weight="bold">#{q.ticketNo}</Text> },
            {
              key: "customerName",
              header: "Client",
              renderCell: (q) => (
                <VStack gap={0}>
                  <Text>{q.customerName}</Text>
                  <Text type="supporting" color="secondary">{formatPhone(q.customerPhone)} · joined {formatTimeIST(q.joinedAt)}</Text>
                </VStack>
              ),
            },
            { key: "serviceName", header: "Service", renderCell: (q) => <VStack gap={0}><Text>{q.serviceName}</Text><Text type="supporting" color="secondary">{q.durationMin} min{q.preferredStylist ? ` · wants ${q.preferredStylist}` : ""}</Text></VStack> },
            { key: "status", header: "Status", renderCell: (q) => (q.status === "waiting" ? <Badge variant="warning" label={`Waiting · ${q.position}`} /> : <Badge variant="success" label={`With ${q.stylistName}`} />) },
            {
              key: "actions",
              header: "Actions",
              align: "end",
              width: pixel(340),
              renderCell: (q) =>
                q.status === "waiting" ? (
                  <HStack gap={2} hAlign="end" vAlign="center">
                    <Selector label="Stylist" isLabelHidden size="sm" options={stylistOptions} value={pick[q.id] ?? null} hasClear onChange={(v) => setPick((p) => ({ ...p, [q.id]: v }))} placeholder="Stylist" width={150} />
                    <Button label="Start" size="sm" variant="primary" isDisabled={!pick[q.id]} onClick={() => act(`/api/staff/queue/${q.id}`, { to: "in_chair", stylistId: pick[q.id] })} />
                    <Button label="Left" size="sm" variant="ghost" onClick={() => act(`/api/staff/queue/${q.id}`, { to: "left" })} />
                  </HStack>
                ) : (
                  <HStack gap={2} hAlign="end">
                    <Button
                      label="Checkout"
                      size="sm"
                      variant="primary"
                      onClick={() => setCheckout({ customerId: q.customerId, customerName: q.customerName, stylistId: q.stylistId, serviceIds: [q.serviceId], queueEntryId: q.id })}
                    />
                  </HStack>
                ),
            },
          ]}
        />
      )}

      {tab === "diary" && (
        <Table
          data={data.appointments}
          idKey="id"
          hasHover
          emptyState={<Text color="secondary">No bookings today.</Text>}
          columns={[
            { key: "startAt", header: "Time", width: pixel(90), renderCell: (a) => <Text weight="bold" hasTabularNumbers>{formatTimeIST(a.startAt)}</Text> },
            { key: "customerName", header: "Client", renderCell: (a) => <VStack gap={0}><Text>{a.customerName}</Text><Text type="supporting" color="secondary">{formatPhone(a.customerPhone)} · via {a.source}</Text></VStack> },
            { key: "serviceName", header: "Service", renderCell: (a) => <VStack gap={0}><Text>{a.serviceName}</Text><Text type="supporting" color="secondary">with {a.stylistName}</Text></VStack> },
            { key: "status", header: "Status", renderCell: (a) => <Badge variant={APPT_BADGE[a.status].variant} label={APPT_BADGE[a.status].label} /> },
            {
              key: "actions",
              header: "Actions",
              align: "end",
              width: pixel(360),
              renderCell: (a) =>
                a.status === "booked" || a.status === "checked_in" ? (
                  <HStack gap={2} hAlign="end" wrap="wrap">
                    {a.status === "booked" && <Button label="Check in" size="sm" onClick={() => act(`/api/staff/appointments/${a.id}`, { to: "checked_in" })} />}
                    <Button label="Checkout" size="sm" variant="primary" onClick={() => setCheckout({ customerId: a.customerId, customerName: a.customerName, stylistId: a.stylistId, serviceIds: [a.serviceId], appointmentId: a.id })} />
                    {a.status === "booked" && <Button label="No-show" size="sm" variant="ghost" onClick={() => act(`/api/staff/appointments/${a.id}`, { to: "no_show" })} />}
                    <Button label="Cancel" size="sm" variant="ghost" onClick={() => act(`/api/staff/appointments/${a.id}`, { to: "cancelled" })} />
                  </HStack>
                ) : null,
            },
          ]}
        />
      )}

      {tab === "clients" && <ClientsPanel floor={data} onCheckout={setCheckout} />}

      <CheckoutDialog
        key={checkout ? `${checkout.customerId}-${checkout.queueEntryId ?? checkout.appointmentId ?? "new"}` : "closed"}
        target={checkout}
        services={data.services}
        stylists={data.stylists}
        onClose={(changed) => {
          setCheckout(null);
          if (changed) refresh();
        }}
      />
      <NewClientDialog
        key={dialog ?? "closed"}
        mode={dialog}
        floor={data}
        onClose={(changed) => {
          setDialog(null);
          if (changed) refresh();
        }}
      />
    </VStack>
  );
}
