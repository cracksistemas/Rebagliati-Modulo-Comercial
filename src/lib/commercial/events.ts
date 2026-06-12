const COMMERCIAL_EVENT = "reba-commercial-data-changed";
const PROFILE_EVENT = "reba-profile-data-changed";

export function broadcastCommercialDataChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMMERCIAL_EVENT));
  }
}

export function subscribeCommercialDataChange(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(COMMERCIAL_EVENT, listener);
  return () => window.removeEventListener(COMMERCIAL_EVENT, listener);
}

export function broadcastProfileChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }
}

export function subscribeProfileChange(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(PROFILE_EVENT, listener);
  return () => window.removeEventListener(PROFILE_EVENT, listener);
}
