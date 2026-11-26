"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Table } from "@astryxdesign/core/Table";

const FEATURES = [
  { title: "QR walk-in queue", text: "Clients scan at reception, pick a service and see their live place in line on their phone. No shouting names, no Sunday arguments." },
  { title: "Booking by stylist", text: "Service menu with prices and durations. Clients pick a stylist and a free slot; two bookings can never overlap for the same stylist." },
  { title: "Rebooking nudges", text: "Each service has a cycle (haircut 28 days, facial 30). When it runs out, opted-in clients get a WhatsApp nudge. You see the rupees that came back." },
  { title: "Checkout and commission", text: "GST bill with cash, UPI, card or wallet. Stylist commission (percent or flat, with service overrides) is worked out on every bill." },
  { title: "Packages and memberships", text: "Sell 6-facial packs and prepaid wallets. Sessions and member discounts apply at checkout automatically." },
  { title: "Review funnel", text: "After each bill, a rating link. 4 and 5 stars go to your Google page; 1 to 3 stars come privately to you first." },
];

const WALKTHROUGH = [
  { title: "Scan as a client", text: "Open the salon QR page on your phone, join the queue and watch your live position." },
  { title: "Run the front desk", text: "Sign in as reception (the demo code shows on screen). Start the next client, then check them out." },
  { title: "See the money", text: "Sign in as the owner: chair utilisation, revenue and commission by stylist, repeat rate, recovered revenue." },
  { title: "Send rebooking nudges", text: "Owner, Rebooking tab: send due nudges, then read them in the WhatsApp outbox." },
];

const PRICING = [
  { id: "queue", tier: "Queue", price: "Free", for: "QR walk-in queue and menu, up to 100 clients" },
  { id: "starter", tier: "Starter", price: "₹799 / month", for: "1 to 3 chairs: booking, CRM, reminders, reviews" },
  { id: "growth", tier: "Growth", price: "₹1,499 / month", for: "4 to 10 chairs: commissions, packages, rebooking nudges" },
  { id: "pro", tier: "Pro", price: "₹2,999 / month", for: "Multi-outlet, memberships, campaigns" },
];

export function Landing({ demoQr }: { demoQr: string }) {
  return (
    <Layout
      height="auto"
      contentWidth={1100}
      content={
        <LayoutContent role="main" padding={6}>
          <VStack gap={10}>
            <HStack hAlign="between" vAlign="center">
              <Text type="large" weight="bold">GlowDesk</Text>
              <Button label="Staff sign in" variant="ghost" href="/login" />
            </HStack>
            <VStack gap={6} hAlign="center">
              <VStack gap={3} hAlign="center">
                <Badge variant="pink" label="For salons, spas and barbershops in India" />
                <Heading level={1} type="display-2" justify="center" textWrap="balance">
                  Fill every chair, bring every client back
                </Heading>
                <Text type="body" color="secondary" justify="center" textWrap="balance">
                  A QR at reception for the walk-in queue and bookings. A WhatsApp nudge when each client is due for their next haircut. A dashboard that shows the rupees those nudges brought back.
                </Text>
              </VStack>
              <HStack gap={3} wrap="wrap" hAlign="center">
                <Button label="Try the demo as a client" variant="primary" size="lg" href={`/q/${demoQr}`} />
                <Button label="Try the front desk and owner view" variant="secondary" size="lg" href="/login" />
              </HStack>
              <Text type="supporting" color="secondary" justify="center">
                The demo salon, its clients and numbers are fictional. Messages and payments are simulated.
              </Text>
            </VStack>

            <VStack gap={4}>
                <Heading level={2} justify="center">What you get</Heading>
                <Grid columns={{ minWidth: 280, max: 3, repeat: "fit" }} gap={4}>
                  {FEATURES.map((f) => (
                    <Card key={f.title}>
                      <VStack gap={2}>
                        <Heading level={3}>{f.title}</Heading>
                        <Text color="secondary">{f.text}</Text>
                      </VStack>
                    </Card>
                  ))}
                </Grid>
            </VStack>

            <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={6}>
              <VStack gap={3}>
                <Heading level={2}>Demo walkthrough</Heading>
                <VStack gap={3}>
                  {WALKTHROUGH.map((w, i) => (
                    <VStack key={w.title} gap={0.5}>
                      <Text weight="bold">{i + 1}. {w.title}</Text>
                      <Text color="secondary">{w.text}</Text>
                    </VStack>
                  ))}
                  <Text>
                    Start here: <Link href={`/q/${demoQr}`}>the demo salon&apos;s QR page</Link>
                  </Text>
                </VStack>
              </VStack>
              <VStack gap={3}>
                <Heading level={2}>Pricing per outlet</Heading>
                <Table
                  data={PRICING}
                  idKey="id"
                  density="compact"
                  columns={[
                    { key: "tier", header: "Plan", renderCell: (p) => <Text weight="bold">{p.tier}</Text> },
                    { key: "price", header: "Price" },
                    { key: "for", header: "For" },
                  ]}
                />
                <Text type="supporting" color="secondary">Excluding 18% GST. Annual plans get 2 months free. No commission on your bookings, ever.</Text>
              </VStack>
            </Grid>

            <Divider />
            <VStack gap={2} hAlign="center">
              <Text type="supporting" color="secondary" justify="center">
                GlowDesk by <Link href="https://craftlayer.store">CraftLayer Studio</Link> · Support <Link href="mailto:glowdesk@craftlayer.store">glowdesk@craftlayer.store</Link> · Hello <Link href="mailto:hello@craftlayer.store">hello@craftlayer.store</Link> · Commercial licences <Link href="mailto:licensing@craftlayer.store">licensing@craftlayer.store</Link>
              </Text>
              <Text type="supporting" color="secondary" justify="center">MVP with demo data, simulated messaging and payments.</Text>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
