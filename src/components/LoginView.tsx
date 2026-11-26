"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { postJson } from "@/lib/live";
import { DemoBadge } from "./Brand";

const DEMO_USERS = [
  { label: "Owner: Rakesh", phone: "98260 00001" },
  { label: "Reception: Komal", phone: "98260 00002" },
];

export function LoginView({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError(undefined);
    setBusy(true);
    try {
      const r = await postJson<{ demoCode: string | null }>("/api/auth/otp", { phone });
      setDemoCode(r.demoCode);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(undefined);
    setBusy(true);
    try {
      const r = await postJson<{ role: "owner" | "staff" }>("/api/auth/verify", { phone, code });
      router.push(next.startsWith("/") && !next.startsWith("//") ? next : r.role === "owner" ? "/owner" : "/staff");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Center role="main" axis="both" padding={6} minHeight="100dvh">
      <VStack gap={4} hAlign="center" width="100%" maxWidth={400}>
        <HStack gap={2} vAlign="center">
          <Text type="large" weight="bold">GlowDesk</Text>
          <DemoBadge />
        </HStack>
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1}>Staff sign in</Heading>
              <Text color="secondary" size="sm">Phone number and a one-time code</Text>
            </VStack>
            {error && <Banner status="error" title={error} />}
            {step === "phone" ? (
              <>
                <TextInput label="Mobile number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="98260 00001" size="lg" onEnter={sendCode} />
                <Button label="Send code" variant="primary" size="lg" isLoading={busy} onClick={sendCode} />
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">Demo accounts</Text>
                  <HStack gap={2} wrap="wrap">
                    {DEMO_USERS.map((u) => (
                      <Button key={u.phone} label={u.label} size="sm" variant="ghost" onClick={() => setPhone(u.phone)} />
                    ))}
                  </HStack>
                </VStack>
              </>
            ) : (
              <>
                {demoCode ? (
                  <Banner status="info" title={`Demo code: ${demoCode}`} description="Shown on screen because this is a demo. A live salon gets it by SMS." />
                ) : (
                  <Banner status="info" title="If this number has a staff account, a code is on its way." />
                )}
                <TextInput label="6-digit code" inputMode="numeric" value={code} onChange={setCode} size="lg" autoComplete="one-time-code" onEnter={verify} hasAutoFocus />
                <Button label="Sign in" variant="primary" size="lg" isLoading={busy} onClick={verify} />
                <Button label="Use another number" variant="ghost" onClick={() => setStep("phone")} />
              </>
            )}
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}
