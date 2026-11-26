"use client";

import NextLink from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import type { ReactNode } from "react";
import { themes, defaultThemeSlug } from "../astryx-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <LinkProvider component={NextLink}>{children}
      </LinkProvider>
    </Theme>
  );
}
