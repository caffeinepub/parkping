import { useCallback, useEffect, useState } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications() {
  const supported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? (Notification.permission as NotificationPermission) : "denied",
  );

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission as NotificationPermission);
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
  }, [supported]);

  return { supported, permission, requestPermission };
}
