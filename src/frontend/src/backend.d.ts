import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type UserId = Principal;
export interface Message {
    id: bigint;
    text: string;
    timestamp: Time;
    senderNote?: string;
    recipientId: UserId;
}
export type Time = bigint;
export interface UserProfile {
    contactInfo: string;
    displayName: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInbox(): Promise<Array<Message>>;
    getMessagesByUser(recipientId: UserId): Promise<Array<Message>>;
    getUserProfile(user: UserId): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(recipientId: UserId, text: string, senderNote: string | null): Promise<bigint>;
}
