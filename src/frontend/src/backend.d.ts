import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface Vehicle {
    id: bigint;
    name: string;
    createdAt: Time;
    description: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface StickerOrder {
    status: StickerOrderStatus;
    vehicleDescription: string;
    displayName: string;
    userId: UserId;
    createdAt: Time;
    orderId: bigint;
    mailingAddress: string;
}
export type UserId = Principal;
export interface ChatSession {
    id: string;
    messages: Array<ChatMessage>;
    ownerId: UserId;
    createdAt: Time;
    ended: boolean;
    unreadByOwner: boolean;
    senderId?: UserId;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Message {
    id: bigint;
    text: string;
    timestamp: Time;
    senderNote?: string;
    recipientId: UserId;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface ChatMessage {
    id: bigint;
    text: string;
    mediaUrl?: string;
    timestamp: Time;
    fromOwner: boolean;
}
export interface SubscriptionStatus {
    paidUntil: bigint;
    isActive: boolean;
    vehicleCount: bigint;
}
export interface UserProfile {
    contactInfo: string;
    displayName: string;
    profilePicture?: ExternalBlob;
}
export enum StickerOrderStatus {
    pending = "pending",
    printed = "printed",
    mailed = "mailed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addVehicle(name: string, description: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimAdmin(token: string): Promise<void>;
    createChatSession(ownerId: UserId, initialText: string, initialMediaUrl: string | null): Promise<string>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    endChatSession(sessionId: string): Promise<void>;
    getAdminSetupToken(): Promise<string>;
    getAllUsers(): Promise<Array<{
        displayName: string;
        userId: UserId;
        vehicleCount: bigint;
        subscriptionPaidUntil: bigint;
    }>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatSession(sessionId: string): Promise<ChatSession>;
    getInbox(): Promise<Array<Message>>;
    getMessagesByUser(recipientId: UserId): Promise<Array<Message>>;
    getMyOrders(): Promise<Array<StickerOrder>>;
    getMySubscriptionStatus(): Promise<SubscriptionStatus>;
    getMyVehicles(): Promise<Array<Vehicle>>;
    getOwnerChatSessions(): Promise<Array<ChatSession>>;
    getStickerOrders(): Promise<Array<StickerOrder>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: UserId): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    markSessionRead(sessionId: string): Promise<void>;
    markSubscriptionPaid(userId: UserId, years: bigint): Promise<void>;
    removeVehicle(vehicleId: bigint): Promise<void>;
    resetAdminSetupToken(): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendChatMessage(sessionId: string, text: string, mediaUrl: string | null, fromOwner: boolean): Promise<bigint>;
    sendMessage(recipientId: UserId, text: string, senderNote: string | null): Promise<bigint>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    submitStickerOrder(mailingAddress: string, vehicleDescription: string): Promise<bigint>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateStickerOrderStatus(orderId: bigint, status: StickerOrderStatus): Promise<void>;
}
