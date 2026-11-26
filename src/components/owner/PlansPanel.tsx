"use client";

import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Plans = {
  packages: { id: string; name: string; serviceName: string; sessions: number; pricePaise: number; validityDays: number }[];
  memberships: { id: string; name: string; pricePaise: number; walletCreditPaise: number; discountPercent: number; validityDays: number }[];
};

export function PlansPanel() {
  const { data, refresh } = useLive<Plans>("/api/staff/plans", 60_000);
  const { data: menu } = useLive<{ services: { id: string; name: string }[] }>("/api/owner/services", 600_000);
  const [pkg, setPkg] = useState({ name: "", serviceId: null as string | null, sessions: 6, rupees: 3000, validityDays: 180 });
  const [mem, setMem] = useState({ name: "", rupees: 5000, walletRupees: 5500, discountPercent: 10, validityDays: 365 });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  async function create(body: unknown) {
    try {
      await postJson("/api/owner/plans", body);
      setMsg({ ok: true, text: "Created. Reception can sell it from a client's card." });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <VStack gap={4}>
      {msg && <Banner status={msg.ok ? "success" : "error"} title={msg.text} />}
      <Heading level={2}>Packages (prepaid sessions)</Heading>
      <Table
        data={data?.packages ?? []}
        idKey="id"
        density="compact"
        columns={[
          { key: "name", header: "Package" },
          { key: "serviceName", header: "Service" },
          { key: "sessions", header: "Sessions", align: "end" },
          { key: "pricePaise", header: "Price", align: "end", renderCell: (p) => <Text hasTabularNumbers>{formatINR(p.pricePaise)}</Text> },
          { key: "validityDays", header: "Valid", align: "end", renderCell: (p) => <Text>{p.validityDays} days</Text> },
        ]}
      />
      <Heading level={2}>Memberships (wallet + discount)</Heading>
      <Table
        data={data?.memberships ?? []}
        idKey="id"
        density="compact"
        columns={[
          { key: "name", header: "Membership" },
          { key: "pricePaise", header: "Price", align: "end", renderCell: (p) => <Text hasTabularNumbers>{formatINR(p.pricePaise)}</Text> },
          { key: "walletCreditPaise", header: "Wallet credit", align: "end", renderCell: (p) => <Text hasTabularNumbers>{formatINR(p.walletCreditPaise)}</Text> },
          { key: "discountPercent", header: "Discount", align: "end", renderCell: (p) => <Text>{p.discountPercent}%</Text> },
          { key: "validityDays", header: "Valid", align: "end", renderCell: (p) => <Text>{p.validityDays} days</Text> },
        ]}
      />
      <Grid columns={{ minWidth: 300, max: 2, repeat: "fit" }} gap={4}>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>New package</Heading>
            <TextInput label="Name" value={pkg.name} onChange={(name) => setPkg({ ...pkg, name })} placeholder="5 hair spas" />
            <Selector label="Service" options={(menu?.services ?? []).map((s) => ({ value: s.id, label: s.name }))} value={pkg.serviceId ?? undefined} onChange={(serviceId) => setPkg({ ...pkg, serviceId })} />
            <NumberInput label="Sessions" value={pkg.sessions} isIntegerOnly min={2} max={50} onChange={(sessions) => setPkg({ ...pkg, sessions })} />
            <NumberInput label="Price (₹)" value={pkg.rupees} min={1} onChange={(rupees) => setPkg({ ...pkg, rupees })} />
            <NumberInput label="Valid for" units="days" value={pkg.validityDays} isIntegerOnly min={7} max={730} onChange={(validityDays) => setPkg({ ...pkg, validityDays })} />
            <Button label="Create package" variant="primary" onClick={() => create({ kind: "package", name: pkg.name, serviceId: pkg.serviceId, sessions: pkg.sessions, pricePaise: Math.round(pkg.rupees * 100), validityDays: pkg.validityDays })} />
          </VStack>
        </Card>
        <Card>
          <VStack gap={3}>
            <Heading level={3}>New membership</Heading>
            <TextInput label="Name" value={mem.name} onChange={(name) => setMem({ ...mem, name })} placeholder="Glow Silver" />
            <NumberInput label="Price (₹)" value={mem.rupees} min={1} onChange={(rupees) => setMem({ ...mem, rupees })} />
            <NumberInput label="Wallet credit (₹)" value={mem.walletRupees} min={0} onChange={(walletRupees) => setMem({ ...mem, walletRupees })} />
            <NumberInput label="Discount on services" units="%" value={mem.discountPercent} isIntegerOnly min={0} max={50} onChange={(discountPercent) => setMem({ ...mem, discountPercent })} />
            <NumberInput label="Valid for" units="days" value={mem.validityDays} isIntegerOnly min={30} max={730} onChange={(validityDays) => setMem({ ...mem, validityDays })} />
            <Button label="Create membership" variant="primary" onClick={() => create({ kind: "membership", name: mem.name, pricePaise: Math.round(mem.rupees * 100), walletCreditPaise: Math.round(mem.walletRupees * 100), discountPercent: mem.discountPercent, validityDays: mem.validityDays })} />
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}
