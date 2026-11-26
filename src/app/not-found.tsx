import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";

export default function NotFound() {
  return (
    <Center role="main" axis="both" padding={6} minHeight="100dvh">
      <VStack gap={3} hAlign="center">
        <Heading level={1}>Page not found</Heading>
        <Text color="secondary">The link may be old. Scan the salon QR again.</Text>
        <Button label="Go to GlowDesk" href="/" variant="primary" />
      </VStack>
    </Center>
  );
}
