"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Service = {
  id: string;
  name: string;
  category: string;
  gender: "women" | "men" | "unisex";
  pricePaise: number;
  durationMin: number;
  cycleDays: number;
  commissionOverridePercent: number | null;
  active: boolean;
};

const BLANK: Omit<Service, "id"> = { name: "", category: "Hair", gender: "unisex", pricePaise: 50_000, durationMin: 30, cycleDays: 28, commissionOverridePercent: null, active: true };

export function MenuPanel() {
  const { data, refresh } = useLive<{ services: Service[] }>("/api/owner/services", 60_000);
  const [edit, setEdit] = useState<(Omit<Service, "id"> & { id: string | null }) | null>(null);
  const [error, setError] = useState<string>();

  async function save() {
    if (!edit) return;
    try {
      const { id, ...body } = edit;
      await postJson(id ? `/api/owner/services/${id}` : "/api/owner/services", body);
      setEdit(null);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <VStack gap={3}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={2}>Service menu</Heading>
        <Button label="Add service" variant="primary" onClick={() => { setError(undefined); setEdit({ ...BLANK, id: null }); }} />
      </HStack>
      <Table
        data={data?.services ?? []}
        idKey="id"
        hasHover
        columns={[
          { key: "name", header: "Service", renderCell: (s) => <VStack gap={0}><Text>{s.name}</Text><Text type="supporting" color="secondary">{s.category} · {s.gender}</Text></VStack> },
          { key: "pricePaise", header: "Price", align: "end", renderCell: (s) => <Text hasTabularNumbers>{formatINR(s.pricePaise)}</Text> },
          { key: "durationMin", header: "Duration", align: "end", renderCell: (s) => <Text>{s.durationMin} min</Text> },
          { key: "cycleDays", header: "Rebook after", align: "end", renderCell: (s) => <Text>{s.cycleDays ? `${s.cycleDays} days` : "No nudge"}</Text> },
          { key: "commissionOverridePercent", header: "Commission", align: "end", renderCell: (s) => <Text>{s.commissionOverridePercent === null ? "Stylist rule" : `${s.commissionOverridePercent}%`}</Text> },
          { key: "active", header: "", renderCell: (s) => (s.active ? null : <Badge label="Hidden" />) },
          { key: "edit", header: "", align: "end", renderCell: (s) => <Button label="Edit" size="sm" variant="ghost" onClick={() => { setError(undefined); setEdit(s); }} /> },
        ]}
      />
      <Dialog isOpen={edit !== null} onOpenChange={(o) => !o && setEdit(null)} width={480} purpose="form">
        <DialogHeader title={edit?.id ? "Edit service" : "Add service"} onOpenChange={(o) => !o && setEdit(null)} />
        {edit && (
          <VStack gap={3} padding={4}>
            {error && <Banner status="error" title={error} />}
            <TextInput label="Name" value={edit.name} onChange={(name) => setEdit({ ...edit, name })} />
            <TextInput label="Category" value={edit.category} onChange={(category) => setEdit({ ...edit, category })} />
            <Selector label="For" options={[{ value: "unisex", label: "Everyone" }, { value: "women", label: "Women" }, { value: "men", label: "Men" }]} value={edit.gender} onChange={(g) => g && setEdit({ ...edit, gender: g as Service["gender"] })} />
            <NumberInput label="Price (₹, before GST)" value={edit.pricePaise / 100} min={0} onChange={(v) => setEdit({ ...edit, pricePaise: Math.round(v * 100) })} />
            <NumberInput label="Duration" units="min" value={edit.durationMin} isIntegerOnly min={5} max={480} onChange={(durationMin) => setEdit({ ...edit, durationMin })} />
            <NumberInput label="Rebook nudge after" description="Days until the client usually needs this again. 0 turns nudges off." units="days" value={edit.cycleDays} isIntegerOnly min={0} max={365} onChange={(cycleDays) => setEdit({ ...edit, cycleDays })} />
            <NumberInput label="Commission override" description="Leave empty to use each stylist's own rule." units="%" value={edit.commissionOverridePercent} hasClear isIntegerOnly min={0} max={100} onChange={(v) => setEdit({ ...edit, commissionOverridePercent: Number.isFinite(v) ? v : null })} />
            <CheckboxInput label="Show on menu and booking page" value={edit.active} onChange={(active) => setEdit({ ...edit, active })} />
            <Button label="Save" variant="primary" onClick={save} />
          </VStack>
        )}
      </Dialog>
    </VStack>
  );
}
