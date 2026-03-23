import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import type { ChatSession, Message } from "../backend.d";
import { createActorWithConfig } from "../config";
import { useActor } from "./useActor";

export type StickerOrderStatus =
  | { pending: null }
  | { printed: null }
  | { mailed: null };

export interface StickerOrder {
  orderId: bigint;
  userId: Principal;
  displayName: string;
  mailingAddress: string;
  vehicleDescription: string;
  status: StickerOrderStatus;
  createdAt: bigint;
}

export function useInbox() {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["inbox"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInbox();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUserProfile(userId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      try {
        const principal = Principal.fromText(userId);
        return actor.getUserProfile(principal);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      recipientId,
      text,
      senderNote,
    }: { recipientId: string; text: string; senderNote?: string }) => {
      const resolvedActor = actor ?? (await createActorWithConfig());
      const principal = Principal.fromText(recipientId);
      return resolvedActor.sendMessage(principal, text, senderNote ?? null);
    },
  });
}

export function useMyOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<StickerOrder[]>({
    queryKey: ["myOrders"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (actor as any).getMyOrders();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStickerOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<StickerOrder[]>({
    queryKey: ["stickerOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getStickerOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitStickerOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mailingAddress,
      vehicleDescription,
    }: {
      mailingAddress: string;
      vehicleDescription: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).submitStickerOrder(
        mailingAddress,
        vehicleDescription,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: bigint;
      status: StickerOrderStatus;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).updateStickerOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stickerOrders"] });
    },
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useClaimAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).claimAdmin(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
    },
  });
}

export function useAdminSetupToken() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["adminSetupToken"],
    queryFn: async () => {
      if (!actor) return "";
      try {
        return (actor as any).getAdminSetupToken();
      } catch {
        return "";
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useResetAdminToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).resetAdminSetupToken();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSetupToken"] });
    },
  });
}

export interface Vehicle {
  id: bigint;
  name: string;
  description: string;
  createdAt: bigint;
}

export function useMyVehicles() {
  const { actor, isFetching } = useActor();
  return useQuery<Vehicle[]>({
    queryKey: ["myVehicles"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (actor as any).getMyVehicles();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddVehicle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: { name: string; description: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).addVehicle(name, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVehicles"] });
    },
  });
}

export function useRemoveVehicle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).removeVehicle(vehicleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVehicles"] });
    },
  });
}

export interface AdminUser {
  userId: Principal;
  displayName: string;
  subscriptionPaidUntil: bigint;
  vehicleCount: bigint;
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<AdminUser[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMarkSubscriptionPaid() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      years,
    }: { userId: Principal; years: number }) => {
      if (!actor) throw new Error("Not authenticated");
      return (actor as any).markSubscriptionPaid(userId, BigInt(years));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

// ─── Chat Hooks ──────────────────────────────────────────────────────────────

export function useOwnerChatSessions() {
  const { actor, isFetching } = useActor();
  return useQuery<ChatSession[]>({
    queryKey: ["ownerChatSessions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOwnerChatSessions();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useChatSession(sessionId: string | null, active = true) {
  const { actor, isFetching } = useActor();
  return useQuery<ChatSession | null>({
    queryKey: ["chatSession", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      // Support unauthenticated access (sender)
      const resolvedActor = actor ?? (await createActorWithConfig());
      return resolvedActor.getChatSession(sessionId);
    },
    enabled: !!sessionId && (!isFetching || !actor),
    refetchInterval: active ? 3000 : false,
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ownerId,
      text,
      mediaUrl,
    }: {
      ownerId: string;
      text: string;
      mediaUrl?: string;
    }) => {
      const resolvedActor = await createActorWithConfig();
      const principal = Principal.fromText(ownerId);
      return resolvedActor.createChatSession(principal, text, mediaUrl ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerChatSessions"] });
    },
  });
}

export function useSendChatMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
      mediaUrl,
      fromOwner,
    }: {
      sessionId: string;
      text: string;
      mediaUrl?: string;
      fromOwner: boolean;
    }) => {
      const resolvedActor = actor ?? (await createActorWithConfig());
      return resolvedActor.sendChatMessage(
        sessionId,
        text,
        mediaUrl ?? null,
        fromOwner,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatSession", variables.sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ["ownerChatSessions"] });
    },
  });
}

export function useEndChatSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const resolvedActor = actor ?? (await createActorWithConfig());
      return resolvedActor.endChatSession(sessionId);
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: ["chatSession", sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ["ownerChatSessions"] });
    },
  });
}

export function useMarkSessionRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!actor) return;
      return actor.markSessionRead(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerChatSessions"] });
    },
  });
}
