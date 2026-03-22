# ParkPing

## Current State
New project. No existing application logic.

## Requested Changes (Diff)

### Add
- User registration and login via authorization component
- Each registered user gets a unique QR code that encodes their user ID / a link to a messaging page
- A public "send message" page reachable via QR code scan (no login required) where anyone can type and submit a short message to the identified user
- An authenticated inbox page where logged-in users can view all messages sent to them
- Backend: store messages (sender note, timestamp, recipient user ID)
- Users can generate/view their personal QR code on a profile/dashboard page

### Modify
- None

### Remove
- None

## Implementation Plan
1. Backend: define Message type (id, recipientId, text, timestamp), store messages in a stable map, expose:
   - `sendMessage(recipientId: Text, text: Text)` - public, no auth required
   - `getMyMessages()` - returns messages for caller
   - `getMyProfile()` - returns caller's principal as text (for QR code generation)
   - `getUserExists(userId: Text)` - check if a user ID is valid before sending
2. Frontend:
   - Home/landing page with two CTAs: "Scan QR" and "Get my QR code" (login)
   - Dashboard (authenticated): shows the user's QR code (encodes a deep-link URL to /send?to=<userId>) and their message inbox
   - Send Message page (/send?to=<userId>): public page, shows a form to send a message to the identified user
   - QR Scanner page: uses qr-code component to scan a QR and redirect to the send page
