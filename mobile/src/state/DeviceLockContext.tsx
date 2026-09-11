import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_KEY = "emaus.devicePin";
const BIOMETRIC_KEY = "emaus.deviceBiometricEnabled";

/** Blocare de dispozitiv (PIN și/sau Face ID/amprentă) — un strat SEPARAT peste
 * AuthContext, nu o înlocuire a lui. AuthContext tot restaurează token-ul/userul din
 * SecureStore exact ca înainte (nu s-a schimbat nimic acolo — risc mic). Ce adaugă
 * stratul de-aici: dacă utilizatorul a activat PIN/biometric pe-acest dispozitiv,
 * `AuthGate` (app/_layout.tsx) cere deblocarea o dată, la fiecare pornire rece a
 * aplicației, înainte să lase ecranele să se vadă — sesiunea tot există în memorie,
 * doar navigarea e blocată de `/unlock` până la deblocare.
 *
 * Doar pe nativ (iOS/Android) — pe web sesiunea nu persistă deloc (vezi comentariul
 * din AuthContext), deci n-are sens "asociat cu acest dispozitiv" acolo; `enabled`
 * rămâne mereu `false` pe web, indiferent de orice.
 */
interface DeviceLockContextValue {
  isLoading: boolean;
  hasPin: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  /** PIN sau biometric activate pentru acest dispozitiv. */
  enabled: boolean;
  /** Deblocat pentru sesiunea curentă a aplicației (resetat la fiecare pornire rece). */
  unlocked: boolean;
  markUnlocked: () => void;
  setupPin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  /** Șterge PIN-ul și dezactivează biometricul pentru acest dispozitiv (nu atinge
   * sesiunea/token-ul — logout-ul rămâne treaba lui AuthContext). Folosit din
   * "Uită acest dispozitiv" în Meniu. */
  forgetDevice: () => Promise<void>;
}

const DeviceLockContext = createContext<DeviceLockContextValue | undefined>(undefined);

export function DeviceLockProvider({ children }: { children: React.ReactNode }) {
  const isNative = Platform.OS !== "web";

  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!isNative) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const [storedPin, storedBiometric, hasHardware, isEnrolled] = await Promise.all([
          SecureStore.getItemAsync(PIN_KEY),
          SecureStore.getItemAsync(BIOMETRIC_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        setHasPin(!!storedPin);
        setBiometricAvailable(hasHardware && isEnrolled);
        setBiometricEnabledState(storedBiometric === "true" && hasHardware && isEnrolled);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isNative]);

  const setupPin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
    setHasPin(true);
  }, []);

  const disablePin = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    setHasPin(false);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return stored !== null && stored === pin;
  }, []);

  const setBiometricEnabled = useCallback(async (value: boolean) => {
    if (value) {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, "true");
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    }
    setBiometricEnabledState(value);
  }, []);

  const authenticateWithBiometrics = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Deblochează aplicația Emaus",
        cancelLabel: "Anulează",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const forgetDevice = useCallback(async () => {
    await Promise.all([SecureStore.deleteItemAsync(PIN_KEY), SecureStore.deleteItemAsync(BIOMETRIC_KEY)]);
    setHasPin(false);
    setBiometricEnabledState(false);
    setUnlocked(false);
  }, []);

  const markUnlocked = useCallback(() => setUnlocked(true), []);

  const value = useMemo<DeviceLockContextValue>(
    () => ({
      isLoading,
      hasPin,
      biometricAvailable,
      biometricEnabled,
      enabled: isNative && (hasPin || biometricEnabled),
      unlocked,
      markUnlocked,
      setupPin,
      disablePin,
      verifyPin,
      setBiometricEnabled,
      authenticateWithBiometrics,
      forgetDevice,
    }),
    [isLoading, hasPin, biometricAvailable, biometricEnabled, isNative, unlocked, markUnlocked, setupPin, disablePin, verifyPin, setBiometricEnabled, authenticateWithBiometrics, forgetDevice]
  );

  return <DeviceLockContext.Provider value={value}>{children}</DeviceLockContext.Provider>;
}

export function useDeviceLock(): DeviceLockContextValue {
  const context = useContext(DeviceLockContext);
  if (!context) throw new Error("useDeviceLock trebuie folosit în interiorul <DeviceLockProvider>.");
  return context;
}
