import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 20_000;

interface PollerOptions {
  actor: any;
  notificationsGranted: boolean;
  enabled: boolean;
}

export function useMessagePoller({
  actor,
  notificationsGranted,
  enabled,
}: PollerOptions) {
  const queryClient = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  // Populate seenIds on first load so we don't spam on mount
  useEffect(() => {
    if (!actor || !enabled || initialised.current) return;

    actor
      .getInbox()
      .then((messages: any[]) => {
        for (const msg of messages) {
          seenIds.current.add(String(msg.id));
        }
        initialised.current = true;
      })
      .catch(() => {
        initialised.current = true;
      });
  }, [actor, enabled]);

  useEffect(() => {
    if (!actor || !enabled) return;

    const interval = setInterval(async () => {
      if (!initialised.current) return;

      try {
        const messages: any[] = await actor.getInbox();
        const newMessages = messages.filter(
          (msg) => !seenIds.current.has(String(msg.id)),
        );

        for (const msg of newMessages) {
          seenIds.current.add(String(msg.id));

          // In-app toast — always shown
          toast("New message on ParkPing", {
            description: msg.text,
            duration: 6000,
          });

          // Browser push notification — only if permission granted
          if (notificationsGranted && typeof Notification !== "undefined") {
            try {
              new Notification("New message on ParkPing", {
                body: msg.text,
                icon: "/favicon.ico",
              });
            } catch {
              // Notification API may fail silently in some browsers
            }
          }
        }

        if (newMessages.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["inbox"] });
        }
      } catch {
        // Network errors — silently ignore
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [actor, enabled, notificationsGranted, queryClient]);
}
