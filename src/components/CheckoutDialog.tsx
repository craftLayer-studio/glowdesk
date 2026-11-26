"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Banner } from "@astryxdesign/core/Banner";
import { Icon } from "@astryxdesign/core/Icon";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { formatINR, type Bill, type PaymentMethod } from "@/domain";
import { postJson } from "@/lib/live";

export interface CheckoutTarget {
  customerId: string;
  customerName: string;
  stylistId: string | null;
  serviceIds: string[];
  appointmentId?: string;
  queueEntryId?: string;
}

interface Result {
  billNo: number;
  bill: Bill;
  recoveredPaise: number;
  reviewUrl: string;
  upiLink: string | null;
}

export function CheckoutDialog(props: {
  target: CheckoutTarget | null;
  onClose: (changed: boolean) => void;
  services: { id: string; name: string; pricePaise: number }[];
  stylists: { id: string; name: string }[];
}) {
  const { target } = props;
  const [serviceIds, setServiceIds] = useState<string[]>(target?.serviceIds ?? []);
  const [stylistId, setStylistId] = useState<string | null>(target?.stylistId ?? null);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [preview, setPreview] = useState<Bill | null>(null);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const canPreview = Boolean(target && stylistId && serviceIds.length > 0 && !result);
  useEffect(() => {
    if (!target || !stylistId || serviceIds.length === 0 || result) return;
    let alive = true;
    postJson<{ bill: Bill }>("/api/staff/checkout", { preview: true, customerId: target.customerId, stylistId, serviceIds, method })
      .then((r) => {
        if (alive) {
          setPreview(r.bill);
          setError(undefined);
        }
      })
      .catch((e: Error) => {
        if (alive) {
          setPreview(null);
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [target, stylistId, serviceIds, method, result]);

  async function confirm() {
    if (!target || !stylistId) return;
    setBusy(true);
    try {
      const r = await postJson<Result>("/api/staff/checkout", {
        customerId: target.customerId,
        stylistId,
        serviceIds,
        method,
        appointmentId: target.appointmentId,
        queueEntryId: target.queueEntryId,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shown = canPreview ? preview : null;
  const lines = (shown?.lines ?? []).map((l, i) => ({ ...l, id: `${l.serviceId}-${i}` }));

  return (
    <Dialog isOpen={target !== null} onOpenChange={(o) => !o && props.onClose(result !== null)} width={560} purpose="form">
      <DialogHeader title={result ? `Bill #${result.billNo}` : `Checkout: ${target?.customerName ?? ""}`} onOpenChange={(o) => !o && props.onClose(result !== null)} />
      <VStack gap={4} padding={4}>
        {error && <Banner status="error" title={error} />}
        {result ? (
          <VStack gap={3}>
            <Heading level={2}>{formatINR(result.bill.total)} paid by {method.toUpperCase()}</Heading>
            <Text color="secondary">
              Stylist commission on this bill: {formatINR(result.bill.commission)}. Bill and review request sent to the client on WhatsApp (simulated outbox).
            </Text>
            {result.recoveredPaise > 0 && <Banner status="success" title={`Recovered revenue: ${formatINR(result.recoveredPaise)}`} description="This client came back within 14 days of a GlowDesk rebooking nudge." />}
            {result.upiLink && (
              <Text>
                UPI payment link: <Link href={result.upiLink}>Open UPI app</Link>
              </Text>
            )}
            <Text type="supporting" color="secondary">
              Demo: open the client&apos;s <Link href={result.reviewUrl} target="_blank">review link</Link>.
            </Text>
            <Button label="Done" variant="primary" onClick={() => props.onClose(true)} />
          </VStack>
        ) : (
          <>
            <Selector label="Stylist" options={props.stylists.map((s) => ({ value: s.id, label: s.name }))} value={stylistId ?? undefined} onChange={setStylistId} placeholder="Who did the work?" />
            <Selector
              label="Add a service"
              options={props.services.map((s) => ({ value: s.id, label: s.name, description: formatINR(s.pricePaise) }))}
              value={null}
              hasClear
              onChange={(v) => v && setServiceIds((ids) => [...ids, v].slice(0, 10))}
              placeholder="Add another service"
              hasSearch
            />
            <Table
              data={lines}
              idKey="id"
              density="compact"
              emptyState={<Text color="secondary">Add a service</Text>}
              columns={[
                {
                  key: "name",
                  header: "Service",
                  renderCell: (l) => (
                    <VStack gap={0}>
                      <Text>{l.name}</Text>
                      {l.customerPackageId && <Text type="supporting" color="accent">Package session used</Text>}
                      {!l.customerPackageId && l.discount > 0 && <Text type="supporting" color="accent">Member discount {formatINR(l.discount)}</Text>}
                    </VStack>
                  ),
                },
                { key: "net", header: "Amount", align: "end", renderCell: (l) => <Text hasTabularNumbers>{formatINR(l.net)}</Text> },
                {
                  key: "remove",
                  header: "",
                  align: "end",
                  renderCell: (l) => (
                    <Button
                      label={`Remove ${l.name}`}
                      isIconOnly
                      icon={<Icon icon={XMarkIcon} size="sm" />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setServiceIds((ids) => ids.filter((_, i) => `${ids[i]}-${i}` !== l.id))}
                    />
                  ),
                },
              ]}
            />
            <SegmentedControl label="Payment method" value={method} onChange={(v) => setMethod(v as PaymentMethod)} layout="fill">
              <SegmentedControlItem value="cash" label="Cash" />
              <SegmentedControlItem value="upi" label="UPI" />
              <SegmentedControlItem value="card" label="Card" />
              <SegmentedControlItem value="wallet" label="Wallet" />
            </SegmentedControl>
            {shown && (
              <VStack gap={1}>
                <HStack hAlign="between"><Text color="secondary">Subtotal</Text><Text hasTabularNumbers>{formatINR(shown.subtotal)}</Text></HStack>
                {shown.discount > 0 && <HStack hAlign="between"><Text color="secondary">Discounts and packages</Text><Text hasTabularNumbers>-{formatINR(shown.discount)}</Text></HStack>}
                <HStack hAlign="between"><Text color="secondary">GST</Text><Text hasTabularNumbers>{formatINR(shown.gst)}</Text></HStack>
                <Divider />
                <HStack hAlign="between"><Text weight="bold">Total</Text><Text weight="bold" hasTabularNumbers>{formatINR(shown.total)}</Text></HStack>
                <HStack hAlign="between"><Text type="supporting" color="secondary">Stylist commission</Text><Text type="supporting" hasTabularNumbers>{formatINR(shown.commission)}</Text></HStack>
              </VStack>
            )}
            <Button label={shown ? `Take ${formatINR(shown.total)}` : "Take payment"} variant="primary" size="lg" isDisabled={!shown} isLoading={busy} onClick={confirm} />
          </>
        )}
      </VStack>
    </Dialog>
  );
}
