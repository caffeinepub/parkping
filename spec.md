# ParkPing

## Current State
- Full-stack app with Motoko backend and React frontend
- One-way messaging: sender sends a message to a vehicle owner via QR code scan
- Vehicle owner views messages in their inbox on the Dashboard
- Blob-storage now added for file/media uploads
- UI uses "car", "Car Owner", and "Dashboard" in various text labels

## Requested Changes (Diff)

### Add
- Bidirectional chat sessions between vehicle owner and message sender
  - A chat session is created when a message is sent via QR code
  - Both parties can send text messages, images, and videos within the session
  - Either party can end the chat at any time
  - Sender gets a persistent chat link (session ID in URL) to return to the conversation
  - Owner can view and reply to chats from their inbox/dashboard
- Media attachment support in chat (images and videos via blob-storage)
- Backend: ChatSession type, ChatMessage type with optional media, create/get/reply/end session APIs

### Modify
- Replace all UI text instances of "car" / "Car" / "CAR" with "vehicle" / "Vehicle" / "VEHICLE" (do not change code variable names or icon names)
- Replace all UI text instances of "dashboard" / "Dashboard" with "windshield glass" / "Windshield Glass"
- SendMessagePage: transform from one-shot form into a full chat UI (create session on first message, then continue chat)
- DashboardPage: inbox shows chat sessions; clicking a session opens a chat UI where owner can reply and end the chat

### Remove
- Old one-way message inbox in favor of chat sessions

## Implementation Plan
1. Add ChatSession and ChatMessage types to backend with create, get, reply, end, and list APIs
2. Keep blob-storage integration for media upload in chat
3. Update SendMessagePage to create a chat session and show full chat UI with media upload
4. Update DashboardPage inbox to list chat sessions and open a chat view for each
5. Replace all "car" text with "vehicle" and "Dashboard" with "Windshield Glass" in UI labels throughout all pages
6. Add polling for new chat messages (extend useMessagePoller or add new hook)
