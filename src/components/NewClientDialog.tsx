"use client";

import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { ISODateString } from "@astryxdesign/core";
import { formatINR, formatTimeIST, istDate } from "@/domain";
import { postJson } from "@/lib/live";
import { ConsentFields } from "./ConsentFields";
import type { Floor } from "./StaffApp";

/** Reception adds a walk-in or books a phone-in client. Consent is asked out loud and recorded with channel "staff". */
export function NewClientDialog({ mode, floor, onClose }: { mode: "walkin" | "book" | null; floor: Floor; onClose: (changed: boolean) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [stylistId, setStylistId] = useState<string | null>(null);
  const [today] = useState(() => istDate(Date.now()) as ISODateString);
  const [date, setDate] = useState<ISODateString>(today);
  const [slots, setSlots] = useState<number[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [su, setSu] = useState(false);
  const [mk, setMk] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "book" || !serviceId || !stylistId) return;
    let alive = true;
    fetch(`/api/staff/slots?serviceId=${serviceId}&stylistId=${stylistId}&date=${date}`)
      .then((r) => r.json())
      .then((j) => alive && setSlots(Array.isArray(j.slots) ? j.slots : []));
    return () => {
      alive = false;
    };
  }, [mode, serviceId, stylistId, date]);

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      if (mode === "walkin") {
        await postJson("/api/staff/queue", { name, phone, serviceId, preferredStylistId: stylistId ?? undefined, consentServiceUpdates: su, consentMarketing: mk });
      } else {
        await postJson("/api/staff/book", { name, phone, serviceId, stylistId, startAt: slot, consentServiceUpdates: su, consentMarketing: mk });
      }
      onClose(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog isOpen={mode !== null} onOpenChange={(o) => !o && onClose(false)} width={520} purpose="form">
      <DialogHeader title={mode === "walkin" ? "Add a walk-in" : "Book by phone"} onOpenChange={(o) => !o && onClose(false)} />
      <VStack gap={4} padding={4}>
        {error && <Banner status="error" title={error} />}
        <TextInput label="Client name" value={name} onChange={setName} />
        <TextInput label="Mobile number" type="tel" value={phone} onChange={setPhone} placeholder="98765 43210" />
        <Selector label="Service" options={floor.services.map((s) => ({ value: s.id, label: s.name, description: `${formatINR(s.pricePaise)} · ${s.durationMin} min` }))} value={serviceId ?? undefined} onChange={setServiceId} hasSearch />
        <Selector
          label={mode === "walkin" ? "Preferred stylist" : "Stylist"}
          options={floor.stylists.map((s) => ({ value: s.id, label: s.name }))}
          value={stylistId}
          hasClear
          onChange={setStylistId}
          isOptional={mode === "walkin"}
        />
        {mode === "book" && (
          <>
            <DateInput label="Date" value={date} onChange={(v) => v && setDate(v)} min={today} />
            {serviceId && stylistId && (
              slots.length === 0 ? (
                <Text color="secondary">No free times that day.</Text>
              ) : (
                <Grid columns={{ minWidth: 88, repeat: "fill" }} gap={2}>
                  {slots.map((s) => (
                    <Button key={s} label={formatTimeIST(s)} size="sm" variant={slot === s ? "primary" : "secondary"} onClick={() => setSlot(s)} />
                  ))}
                </Grid>
              )
            )}
          </>
        )}
        <Text type="supporting" color="secondary">Read the two options to the client and tick only what they agree to.</Text>
        <ConsentFields purpose={mode === "walkin" ? "queue" : "booking"} serviceUpdates={su} marketing={mk} onServiceUpdates={setSu} onMarketing={setMk} />
        <Button label={mode === "walkin" ? "Add to queue" : "Book"} variant="primary" isLoading={busy} onClick={save} isDisabled={mode === "book" && slot === null} />
      </VStack>
    </Dialog>
  );
}
