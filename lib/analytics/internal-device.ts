/** localStorage flag: this browser is an internal/team device for analytics. */
export const INTERNAL_DEVICE_KEY = "pact_internal_device";

export function isInternalDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INTERNAL_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setInternalDevice(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTERNAL_DEVICE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * When an admin session is detected, set the flag once if the user has never
 * chosen (key absent). Does not overwrite an explicit off (`"0"`).
 */
export function ensureInternalDeviceFromAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(INTERNAL_DEVICE_KEY) === null) {
      localStorage.setItem(INTERNAL_DEVICE_KEY, "1");
    }
  } catch {
    // ignore
  }
}
