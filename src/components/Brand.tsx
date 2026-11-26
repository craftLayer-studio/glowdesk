"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

export function DemoBadge() {
  return <Badge variant="warning" label="Demo" />;
}

export function SalonTitle({ name, isDemo }: { name: string; isDemo: boolean }) {
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Text type="large" weight="bold">
        {name}
      </Text>
      {isDemo && <DemoBadge />}
    </HStack>
  );
}
