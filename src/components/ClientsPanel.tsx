"use client";

import { useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR, formatIST, formatPhone } from "@/domain";
import { postJson, useLive } from "@/lib/live";
import type { CheckoutTarget } from "./CheckoutDialog";
import type { Floor } from "./StaffApp";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  spend: number;
  lastVisit: number | null;
  serviceUpdates: boolean;
  marketing: boolean;
};

type Detail = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  consent: { service_updates: boolean; marketing: boolean };
  favouriteStylist: string | null;
  spend: number;
  visits: { id: string; billNo: number; at: number; total: number; stylistName: string; method: string; services: string[] }[];
  packages: { id: string; name: string; sessionsLeft: number; sessions: number; expiresAt: number }[];
  memberships: { id: string; name: string; walletBalance: number; discountPercent: number; expiresAt: number }[];
  consentLog: { purpose: string; granted: boolean; channel: string; noticeVersion: string; at: number }[];
};

type Plans = {
  packages: { id: string; name: string; pricePaise: number; sessions: number; serviceName: string; active: boolean }[];
  memberships: { id: string; name: string; pricePaise: number; walletCreditPaise: number; discountPercent: number; active: boolean }[];
};

export function ClientsPanel({ floor, onCheckout }: { floor: Floor; onCheckout: (t: CheckoutTarget) => void }) {
  const { data, refresh } = useLive<{ clients: ClientRow[] }>("/api/staff/clients", 30_000);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data?.clients ?? [];
    return (needle ? list.filter((c) => c.name.toLowerCase().includes(needle) || c.phone.includes(needle.replace(/\s/g, ""))) : list).slice(0, 200);
  }, [data, q]);
  return (
    <VStack gap={3}>
      <TextInput label="Search clients" isLabelHidden placeholder="Search by name or phone" value={q} onChange={setQ} startIcon="search" hasClear />
      <Text type="supporting" color="secondary">{data?.clients.length ?? 0} clients in the CRM</Text>
      <Table
        data={rows}
        idKey="id"
        hasHover
        density="compact"
        columns={[
          { key: "name", header: "Client", renderCell: (c) => <Button label={c.name} variant="ghost" size="sm" onClick={() => setOpenId(c.id)} /> },
          { key: "phone", header: "Phone", renderCell: (c) => <Text hasTabularNumbers>{formatPhone(c.phone)}</Text> },
          { key: "visits", header: "Visits", align: "end" },
          { key: "spend", header: "Spend", align: "end", renderCell: (c) => <Text hasTabularNumbers>{formatINR(c.spend)}</Text> },
          { key: "lastVisit", header: "Last visit", renderCell: (c) => <Text>{c.lastVisit ? formatIST(c.lastVisit) : "Never"}</Text> },
          { key: "marketing", header: "Offers", renderCell: (c) => (c.marketing ? <Badge variant="success" label="Opted in" /> : <Badge label="No" />) },
        ]}
      />
      <ClientDialog key={openId ?? "closed"} id={openId} floor={floor} onClose={() => { setOpenId(null); refresh(); }} onCheckout={(t) => { setOpenId(null); onCheckout(t); }} />
    </VStack>
  );
}

function ClientDialog({ id, floor, onClose, onCheckout }: { id: string | null; floor: Floor; onClose: () => void; onCheckout: (t: CheckoutTarget) => void }) {
  const { data, refresh } = useLive<Detail>(id ? `/api/staff/clients/${id}` : null, 60_000);
  const { data: plans } = useLive<Plans>(id ? "/api/staff/plans" : null, 600_000);
  const [planId, setPlanId] = useState<string | null>(null);
  const [seller, setSeller] = useState<string | null>(null);
  const [method, setMethod] = useState("upi");
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();


  async function call(url: string, body: unknown, ok: string) {
    try {
      await postJson(url, body);
      setMsg({ ok: true, text: ok });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  const planOptions = [
    ...(plans?.packages ?? []).filter((p) => p.active).map((p) => ({ value: `package:${p.id}`, label: p.name, description: `${formatINR(p.pricePaise)} · ${p.sessions} × ${p.serviceName}` })),
    ...(plans?.memberships ?? []).filter((m) => m.active).map((m) => ({ value: `membership:${m.id}`, label: m.name, description: `${formatINR(m.pricePaise)} · ${formatINR(m.walletCreditPaise)} wallet + ${m.discountPercent}% off` })),
  ];

  return (
    <Dialog isOpen={id !== null} onOpenChange={(o) => !o && onClose()} width={720}>
      <DialogHeader title={data?.name ?? "Client"} subtitle={data ? `${formatPhone(data.phone)} · lifetime ${formatINR(data.spend)}${data.favouriteStylist ? ` · usually with ${data.favouriteStylist}` : ""}` : undefined} onOpenChange={(o) => !o && onClose()} />
      {data && (
        <VStack gap={4} padding={4}>
          {msg && <Banner status={msg.ok ? "success" : "error"} title={msg.text} />}
          <HStack gap={2} wrap="wrap">
            <Badge variant={data.consent.service_updates ? "success" : "neutral"} label={data.consent.service_updates ? "Visit updates: yes" : "Visit updates: no"} />
            <Badge variant={data.consent.marketing ? "success" : "neutral"} label={data.consent.marketing ? "Offers: yes" : "Offers: no"} />
            <Button
              label={data.consent.marketing ? "Record opt-out of offers" : "Record opt-in to offers (client asked)"}
              size="sm"
              variant="ghost"
              onClick={() => call(`/api/staff/clients/${data.id}/consent`, { purpose: "marketing", granted: !data.consent.marketing }, "Consent updated")}
            />
            <Button label="New bill" size="sm" variant="primary" onClick={() => onCheckout({ customerId: data.id, customerName: data.name, stylistId: null, serviceIds: [] })} />
          </HStack>
          <NotesEditor key={data.notes} initial={data.notes} onSave={(notes) => call(`/api/staff/clients/${data.id}`, { notes }, "Notes saved")} />

          <Heading level={3}>Packages and membership</Heading>
          {data.packages.length === 0 && data.memberships.length === 0 && <Text color="secondary">None active.</Text>}
          {data.packages.map((p) => (
            <Text key={p.id}>{p.name}: {p.sessionsLeft} of {p.sessions} sessions left, valid till {formatIST(p.expiresAt)}</Text>
          ))}
          {data.memberships.map((m) => (
            <Text key={m.id}>{m.name}: wallet {formatINR(m.walletBalance)}, {m.discountPercent}% off, valid till {formatIST(m.expiresAt)}</Text>
          ))}
          <HStack gap={2} wrap="wrap" vAlign="end">
            <Selector label="Sell a package or membership" options={planOptions} value={planId} hasClear onChange={setPlanId} width={280} />
            <Selector label="Sold by" options={floor.stylists.map((s) => ({ value: s.id, label: s.name }))} value={seller} hasClear onChange={setSeller} isOptional width={180} />
            <SegmentedControl label="Paid by" value={method} onChange={setMethod}>
              <SegmentedControlItem value="cash" label="Cash" />
              <SegmentedControlItem value="upi" label="UPI" />
              <SegmentedControlItem value="card" label="Card" />
            </SegmentedControl>
            <Button
              label="Sell"
              variant="primary"
              isDisabled={!planId}
              onClick={() => {
                const [kind, pid] = (planId ?? "").split(":");
                void call("/api/staff/sell", { customerId: data.id, kind, planId: pid, stylistId: seller ?? undefined, method }, "Sold. Sessions and wallet are ready to use at checkout.");
              }}
            />
          </HStack>

          <Heading level={3}>Visit history</Heading>
          <Table
            data={data.visits}
            idKey="id"
            density="compact"
            emptyState={<Text color="secondary">No visits yet.</Text>}
            columns={[
              { key: "at", header: "Date", renderCell: (v) => <Text>{formatIST(v.at)}</Text> },
              { key: "services", header: "Services", renderCell: (v) => <Text>{v.services.join(", ")}</Text> },
              { key: "stylistName", header: "Stylist" },
              { key: "total", header: "Bill", align: "end", renderCell: (v) => <Text hasTabularNumbers>{formatINR(v.total)}</Text> },
            ]}
          />
          <Heading level={3}>Consent log</Heading>
          <Table
            data={data.consentLog.map((c, i) => ({ ...c, id: String(i) }))}
            idKey="id"
            density="compact"
            columns={[
              { key: "at", header: "When", renderCell: (c) => <Text>{formatIST(c.at)}</Text> },
              { key: "purpose", header: "Purpose", renderCell: (c) => <Text>{c.purpose === "marketing" ? "Offers and reminders" : "Visit updates"}</Text> },
              { key: "granted", header: "Choice", renderCell: (c) => <Text>{c.granted ? "Yes" : "No"}</Text> },
              { key: "channel", header: "Channel" },
              { key: "noticeVersion", header: "Notice" },
            ]}
          />
        </VStack>
      )}
    </Dialog>
  );
}

function NotesEditor({ initial, onSave }: { initial: string; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(initial);
  return (
    <VStack gap={2}>
      <TextArea label="Notes (allergies, colour formula, preferences)" value={notes} onChange={setNotes} rows={3} maxLength={2000} />
      <HStack>
        <Button label="Save notes" size="sm" onClick={() => onSave(notes)} />
      </HStack>
    </VStack>
  );
}
