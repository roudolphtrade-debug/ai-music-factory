import { useEffect, useState } from "react";
import { loadEnabledProviders, type EnabledProviders } from "./providers";

const NONE: EnabledProviders = { google: false };

/** The providers switched on in the project; everything is off until the service has answered. */
export function useEnabledProviders(): EnabledProviders {
  const [providers, setProviders] = useState<EnabledProviders>(NONE);
  useEffect(() => {
    let current = true;
    void loadEnabledProviders().then((value) => {
      if (current) setProviders(value);
    });
    return () => {
      current = false;
    };
  }, []);
  return providers;
}
