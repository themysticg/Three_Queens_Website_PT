"use client";

import { createContext, useContext } from "react";
import type { BrandingSettings } from "@/lib/branding";

const BrandingContext = createContext<BrandingSettings | null>(null);

type BrandingProviderProps = {
  initialSettings: BrandingSettings;
  children: React.ReactNode;
};

export function BrandingProvider({
  initialSettings,
  children,
}: BrandingProviderProps) {
  return (
    <BrandingContext.Provider value={initialSettings}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingSettings {
  const value = useContext(BrandingContext);

  if (!value) {
    throw new Error("useBranding must be used within BrandingProvider");
  }

  return value;
}
