"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TopNav } from "@astryxdesign/core/TopNav";
import { postJson } from "@/lib/live";
import { DemoBadge } from "./Brand";

export function Shell({ children, role, name, active }: { children: ReactNode; role: "owner" | "staff"; name: string; active: "staff" | "owner" | "qr" }) {
  const router = useRouter();
  return (
    <AppShell
      height="auto"
      contentPadding={4}
      topNav={
        <TopNav
          label="GlowDesk"
          heading={
            <HStack gap={2} vAlign="center">
              <Text type="large" weight="bold">GlowDesk</Text>
              <DemoBadge />
            </HStack>
          }
          startContent={
            <HStack gap={1} wrap="wrap">
              <Button label="Front desk" variant={active === "staff" ? "secondary" : "ghost"} size="sm" href="/staff" />
              {role === "owner" && <Button label="Owner" variant={active === "owner" ? "secondary" : "ghost"} size="sm" href="/owner" />}
              {role === "owner" && <Button label="QR sheet" variant={active === "qr" ? "secondary" : "ghost"} size="sm" href="/owner/qr" />}
            </HStack>
          }
          endContent={
            <HStack gap={2} vAlign="center">
              <Text type="supporting" color="secondary">{name} · {role}</Text>
              <Button
                label="Sign out"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await postJson("/api/auth/logout");
                  router.push("/login");
                }}
              />
            </HStack>
          }
        />
      }>
      {children}
    </AppShell>
  );
}
