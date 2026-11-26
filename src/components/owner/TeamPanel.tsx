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
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR, formatPhone } from "@/domain";
import { postJson, useLive } from "@/lib/live";

type Stylist = { id: string; name: string; phone: string; title: string; commissionType: "percent" | "flat"; commissionValue: number; packagePercent: number; active: boolean };
const BLANK: Omit<Stylist, "id"> = { name: "", phone: "", title: "", commissionType: "percent", commissionValue: 30, packagePercent: 5, active: true };

export function TeamPanel() {
  const { data, refresh } = useLive<{ stylists: Stylist[] }>("/api/owner/stylists", 60_000);
  const [edit, setEdit] = useState<(Omit<Stylist, "id"> & { id: string | null }) | null>(null);
  const [error, setError] = useState<string>();
  async function save() {
    if (!edit) return;
    try {
      const { id, ...body } = edit;
      await postJson(id ? `/api/owner/stylists/${id}` : "/api/owner/stylists", body);
      setEdit(null);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <VStack gap={3}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={2}>Stylists and commission rules</Heading>
        <Button label="Add stylist" variant="primary" onClick={() => { setError(undefined); setEdit({ ...BLANK, id: null }); }} />
      </HStack>
      <Table
        data={data?.stylists ?? []}
        idKey="id"
        columns={[
          { key: "name", header: "Stylist", renderCell: (s) => <VStack gap={0}><Text>{s.name}</Text><Text type="supporting" color="secondary">{s.title}</Text></VStack> },
          { key: "phone", header: "Phone", renderCell: (s) => <Text>{s.phone ? formatPhone(s.phone) : ""}</Text> },
          { key: "commissionValue", header: "Service commission", renderCell: (s) => <Text>{s.commissionType === "percent" ? `${s.commissionValue}% of service` : `${formatINR(s.commissionValue)} per service`}</Text> },
          { key: "packagePercent", header: "Package sales", renderCell: (s) => <Text>{s.packagePercent}%</Text> },
          { key: "active", header: "", renderCell: (s) => (s.active ? null : <Badge label="Inactive" />) },
          { key: "edit", header: "", align: "end", renderCell: (s) => <Button label="Edit" size="sm" variant="ghost" onClick={() => { setError(undefined); setEdit(s); }} /> },
        ]}
      />
      <Dialog isOpen={edit !== null} onOpenChange={(o) => !o && setEdit(null)} width={480} purpose="form">
        <DialogHeader title={edit?.id ? "Edit stylist" : "Add stylist"} onOpenChange={(o) => !o && setEdit(null)} />
        {edit && (
          <VStack gap={3} padding={4}>
            {error && <Banner status="error" title={error} />}
            <TextInput label="Name" value={edit.name} onChange={(name) => setEdit({ ...edit, name })} />
            <TextInput label="Title" value={edit.title} onChange={(title) => setEdit({ ...edit, title })} placeholder="Senior barber" />
            <TextInput label="Phone" type="tel" value={edit.phone} onChange={(phone) => setEdit({ ...edit, phone })} isOptional />
            <SegmentedControl label="Commission type" value={edit.commissionType} onChange={(v) => setEdit({ ...edit, commissionType: v as Stylist["commissionType"], commissionValue: v === "flat" ? 8000 : 30 })}>
              <SegmentedControlItem value="percent" label="Percent of service" />
              <SegmentedControlItem value="flat" label="Flat per service" />
            </SegmentedControl>
            {edit.commissionType === "percent" ? (
              <NumberInput label="Commission" units="%" value={edit.commissionValue} isIntegerOnly min={0} max={100} onChange={(commissionValue) => setEdit({ ...edit, commissionValue })} />
            ) : (
              <NumberInput label="Commission per service (₹)" value={edit.commissionValue / 100} min={0} onChange={(v) => setEdit({ ...edit, commissionValue: Math.round(v * 100) })} />
            )}
            <NumberInput label="Commission on packages and memberships sold" units="%" value={edit.packagePercent} isIntegerOnly min={0} max={100} onChange={(packagePercent) => setEdit({ ...edit, packagePercent })} />
            <CheckboxInput label="Active (takes clients)" value={edit.active} onChange={(active) => setEdit({ ...edit, active })} />
            <Button label="Save" variant="primary" onClick={save} />
          </VStack>
        )}
      </Dialog>
    </VStack>
  );
}
