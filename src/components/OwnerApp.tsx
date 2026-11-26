"use client";

import { useState } from "react";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { DashboardPanel } from "./owner/DashboardPanel";
import { MenuPanel } from "./owner/MenuPanel";
import { MessagesPanel } from "./owner/MessagesPanel";
import { NudgesPanel } from "./owner/NudgesPanel";
import { PlansPanel } from "./owner/PlansPanel";
import { SettingsPanel } from "./owner/SettingsPanel";
import { TeamPanel } from "./owner/TeamPanel";

export function OwnerApp() {
  const [tab, setTab] = useState("dashboard");
  return (
    <VStack gap={5}>
      <VStack gap={0.5}>
        <Heading level={1}>Owner</Heading>
        <Text color="secondary">Chairs, money, and the clients who came back.</Text>
      </VStack>
      <TabList value={tab} onChange={setTab} hasDivider overflow="scroll">
        <Tab value="dashboard" label="Dashboard" />
        <Tab value="nudges" label="Rebooking" />
        <Tab value="menu" label="Service menu" />
        <Tab value="team" label="Stylists" />
        <Tab value="plans" label="Packages" />
        <Tab value="messages" label="WhatsApp outbox" />
        <Tab value="settings" label="Settings" />
      </TabList>
      {tab === "dashboard" && <DashboardPanel />}
      {tab === "nudges" && <NudgesPanel />}
      {tab === "menu" && <MenuPanel />}
      {tab === "team" && <TeamPanel />}
      {tab === "plans" && <PlansPanel />}
      {tab === "messages" && <MessagesPanel />}
      {tab === "settings" && <SettingsPanel />}
    </VStack>
  );
}
