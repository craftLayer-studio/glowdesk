"use client";

import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { NOTICE_TEXT, NOTICE_VERSION } from "@/domain";

/** DPDP consent capture: two separate, unticked opt-ins plus the notice. */
export function ConsentFields(props: {
  serviceUpdates: boolean;
  marketing: boolean;
  onServiceUpdates: (v: boolean) => void;
  onMarketing: (v: boolean) => void;
  purpose: "queue" | "booking";
}) {
  return (
    <VStack gap={2}>
      <CheckboxInput
        label={props.purpose === "queue" ? "Send me queue updates on WhatsApp" : "Send me booking confirmation and reminders on WhatsApp"}
        description="Needed to hold your place. Only about this visit."
        value={props.serviceUpdates}
        onChange={props.onServiceUpdates}
        isRequired
      />
      <CheckboxInput
        label="Send me rebooking reminders and offers"
        description="Optional. At most 2 messages a month. Reply STOP any time."
        value={props.marketing}
        onChange={props.onMarketing}
        isOptional
      />
      <Text type="supporting" color="secondary">
        {NOTICE_TEXT} Notice {NOTICE_VERSION}.
      </Text>
    </VStack>
  );
}
