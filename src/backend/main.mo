import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);


  type UserId = Principal;

  public type UserProfile = {
    displayName : Text;
    contactInfo : Text;
  };

  public type Message = {
    id : Nat;
    recipientId : UserId;
    text : Text;
    timestamp : Time.Time;
    senderNote : ?Text;
  };

  public type StickerOrderStatus = { #pending; #printed; #mailed };

  public type StickerOrder = {
    orderId : Nat;
    userId : UserId;
    displayName : Text;
    mailingAddress : Text;
    vehicleDescription : Text;
    status : StickerOrderStatus;
    createdAt : Time.Time;
  };

  public type Vehicle = {
    id : Nat;
    name : Text;
    description : Text;
    createdAt : Time.Time;
  };

  public type SubscriptionStatus = {
    paidUntil : Int;
    vehicleCount : Nat;
    isActive : Bool;
  };

  public type SenderRole = { #owner; #sender };

  public type ChatMessage = {
    id : Nat;
    sessionId : Nat;
    senderRole : SenderRole;
    text : Text;
    mediaUrl : ?Text;
    timestamp : Time.Time;
  };

  public type ChatSession = {
    id : Nat;
    vehicleOwnerId : UserId;
    senderToken : Text;
    startedAt : Time.Time;
    isActive : Bool;
    lastMessageAt : Time.Time;
  };

  module Message {
    public func compareByTimestampDesc(a : Message, b : Message) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  var nextMessageId = 0;
  let messages = Map.empty<Nat, Message>();

  let userProfiles = Map.empty<UserId, UserProfile>();

  var nextOrderId = 0;
  let stickerOrders = Map.empty<Nat, StickerOrder>();

  // Vehicles: userId -> [Vehicle]
  let userVehicles = Map.empty<UserId, [Vehicle]>();
  var nextVehicleId = 0;

  // Subscription: userId -> paidUntil timestamp (nanoseconds)
  let subscriptions = Map.empty<UserId, Int>();

  // Chat
  var nextSessionId = 0;
  var nextChatMessageId = 0;
  let chatSessions = Map.empty<Nat, ChatSession>();
  let chatMessages = Map.empty<Nat, ChatMessage>();

  // Admin setup token
  var adminSetupToken : Text = "parkping-admin-setup";
  var adminTokenVersion : Nat = 1;

  // ---- Admin Token ----

  public query ({ caller }) func getAdminSetupToken() : async Text {
    if (not accessControlState.adminAssigned or AccessControl.isAdmin(accessControlState, caller)) {
      adminSetupToken
    } else {
      Runtime.trap("Unauthorized: Admin only")
    }
  };

  public shared ({ caller }) func claimAdmin(token : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to claim admin");
    };
    if (token != adminSetupToken) {
      Runtime.trap("Invalid admin setup token");
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    adminTokenVersion += 1;
    adminSetupToken := "parkping-admin-" # adminTokenVersion.toText();
  };

  public shared ({ caller }) func resetAdminSetupToken() : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    adminTokenVersion += 1;
    adminSetupToken := "parkping-admin-" # adminTokenVersion.toText();
    adminSetupToken
  };

  // ---- User Profiles ----

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve profiles");
    };
    userProfiles.get(caller);
  };

  public query func getUserProfile(user : UserId) : async ?UserProfile {
    userProfiles.get(user);
  };

  // ---- Legacy Messaging (kept for backward compat) ----

  public shared func sendMessage(recipientId : UserId, text : Text, senderNote : ?Text) : async Nat {
    if (not userProfiles.containsKey(recipientId)) {
      Runtime.trap("Recipient user does not exist. Please double-check the QR code.");
    };
    let messageId = nextMessageId;
    let message : Message = {
      id = messageId;
      recipientId;
      text;
      timestamp = Time.now();
      senderNote;
    };
    messages.add(messageId, message);
    nextMessageId += 1;
    messageId;
  };

  public query ({ caller }) func getInbox() : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inbox");
    };
    messages.values().toArray().filter(
      func(m) { m.recipientId == caller }
    ).sort(
      Message.compareByTimestampDesc
    );
  };

  public query ({ caller }) func getMessagesByUser(recipientId : UserId) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    if (caller != recipientId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own messages");
    };
    messages.values().toArray().filter(
      func(m) { m.recipientId == recipientId }
    ).sort(
      Message.compareByTimestampDesc
    );
  };

  // ---- Two-Way Chat Sessions ----

  // Anyone (including anonymous) can create a chat session with a registered vehicle owner
  public shared func createChatSession(recipientId : UserId) : async { sessionId : Nat; senderToken : Text } {
    if (not userProfiles.containsKey(recipientId)) {
      Runtime.trap("Recipient user does not exist. Please double-check the QR code.");
    };
    let sessionId = nextSessionId;
    let senderToken = "spk-" # sessionId.toText() # "-" # (Time.now() % 1_000_000_000).toText();
    let session : ChatSession = {
      id = sessionId;
      vehicleOwnerId = recipientId;
      senderToken;
      startedAt = Time.now();
      isActive = true;
      lastMessageAt = Time.now();
    };
    chatSessions.add(sessionId, session);
    nextSessionId += 1;
    { sessionId; senderToken };
  };

  // Sender (anonymous, uses token) sends a message
  public shared func sendSenderChatMessage(sessionId : Nat, senderToken : Text, text : Text, mediaUrl : ?Text) : async Nat {
    switch (chatSessions.get(sessionId)) {
      case null Runtime.trap("Chat session not found");
      case (?session) {
        if (not session.isActive) Runtime.trap("Chat session has ended");
        if (session.senderToken != senderToken) Runtime.trap("Invalid sender token");
        let msgId = nextChatMessageId;
        let msg : ChatMessage = {
          id = msgId;
          sessionId;
          senderRole = #sender;
          text;
          mediaUrl;
          timestamp = Time.now();
        };
        chatMessages.add(msgId, msg);
        nextChatMessageId += 1;
        // Update lastMessageAt
        let updated : ChatSession = {
          id = session.id;
          vehicleOwnerId = session.vehicleOwnerId;
          senderToken = session.senderToken;
          startedAt = session.startedAt;
          isActive = session.isActive;
          lastMessageAt = Time.now();
        };
        chatSessions.add(sessionId, updated);
        msgId;
      };
    };
  };

  // Owner (authenticated) sends a reply
  public shared ({ caller }) func sendOwnerChatMessage(sessionId : Nat, text : Text, mediaUrl : ?Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can reply");
    };
    switch (chatSessions.get(sessionId)) {
      case null Runtime.trap("Chat session not found");
      case (?session) {
        if (session.vehicleOwnerId != caller) Runtime.trap("Unauthorized: Not the vehicle owner for this session");
        if (not session.isActive) Runtime.trap("Chat session has ended");
        let msgId = nextChatMessageId;
        let msg : ChatMessage = {
          id = msgId;
          sessionId;
          senderRole = #owner;
          text;
          mediaUrl;
          timestamp = Time.now();
        };
        chatMessages.add(msgId, msg);
        nextChatMessageId += 1;
        let updated : ChatSession = {
          id = session.id;
          vehicleOwnerId = session.vehicleOwnerId;
          senderToken = session.senderToken;
          startedAt = session.startedAt;
          isActive = session.isActive;
          lastMessageAt = Time.now();
        };
        chatSessions.add(sessionId, updated);
        msgId;
      };
    };
  };

  // Get messages - owner uses auth, sender uses token
  public query ({ caller }) func getChatMessages(sessionId : Nat, senderToken : ?Text) : async [ChatMessage] {
    switch (chatSessions.get(sessionId)) {
      case null Runtime.trap("Chat session not found");
      case (?session) {
        let isOwner = (not caller.isAnonymous()) and (session.vehicleOwnerId == caller);
        let isSender = switch (senderToken) {
          case (?token) token == session.senderToken;
          case null false;
        };
        if (not isOwner and not isSender) {
          Runtime.trap("Unauthorized: Must be owner or provide valid sender token");
        };
        chatMessages.values().toArray().filter(
          func(m : ChatMessage) : Bool { m.sessionId == sessionId }
        );
      };
    };
  };

  // Get owner's chat sessions
  public query ({ caller }) func getOwnerChatSessions() : async [ChatSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view chat sessions");
    };
    chatSessions.values().toArray().filter(
      func(s : ChatSession) : Bool { s.vehicleOwnerId == caller }
    );
  };

  // End a chat session - owner or sender can end it
  public shared ({ caller }) func endChatSession(sessionId : Nat, senderToken : ?Text) : async () {
    switch (chatSessions.get(sessionId)) {
      case null Runtime.trap("Chat session not found");
      case (?session) {
        let isOwner = (not caller.isAnonymous()) and (session.vehicleOwnerId == caller);
        let isSender = switch (senderToken) {
          case (?token) token == session.senderToken;
          case null false;
        };
        if (not isOwner and not isSender) {
          Runtime.trap("Unauthorized: Must be owner or provide valid sender token");
        };
        let updated : ChatSession = {
          id = session.id;
          vehicleOwnerId = session.vehicleOwnerId;
          senderToken = session.senderToken;
          startedAt = session.startedAt;
          isActive = false;
          lastMessageAt = session.lastMessageAt;
        };
        chatSessions.add(sessionId, updated);
      };
    };
  };

  // ---- Sticker Orders ----

  public shared ({ caller }) func submitStickerOrder(mailingAddress : Text, vehicleDescription : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit sticker orders");
    };
    let displayName = switch (userProfiles.get(caller)) {
      case (?p) p.displayName;
      case null "";
    };
    let orderId = nextOrderId;
    let order : StickerOrder = {
      orderId;
      userId = caller;
      displayName;
      mailingAddress;
      vehicleDescription;
      status = #pending;
      createdAt = Time.now();
    };
    stickerOrders.add(orderId, order);
    nextOrderId += 1;
    orderId;
  };

  public query ({ caller }) func getStickerOrders() : async [StickerOrder] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    stickerOrders.values().toArray();
  };

  public shared ({ caller }) func updateStickerOrderStatus(orderId : Nat, status : StickerOrderStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (stickerOrders.get(orderId)) {
      case (?order) {
        let updated : StickerOrder = {
          orderId = order.orderId;
          userId = order.userId;
          displayName = order.displayName;
          mailingAddress = order.mailingAddress;
          vehicleDescription = order.vehicleDescription;
          status;
          createdAt = order.createdAt;
        };
        stickerOrders.add(orderId, updated);
      };
      case null Runtime.trap("Order not found");
    };
  };

  public query ({ caller }) func getMyOrders() : async [StickerOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    stickerOrders.values().toArray().filter(func(o) { o.userId == caller });
  };

  // ---- Vehicle Management ----

  public shared ({ caller }) func addVehicle(name : Text, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add vehicles");
    };
    let vehicleId = nextVehicleId;
    let vehicle : Vehicle = {
      id = vehicleId;
      name;
      description;
      createdAt = Time.now();
    };
    let existing = switch (userVehicles.get(caller)) {
      case (?arr) arr;
      case null [];
    };
    userVehicles.add(caller, existing.concat([vehicle]));
    nextVehicleId += 1;
    vehicleId;
  };

  public query ({ caller }) func getMyVehicles() : async [Vehicle] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vehicles");
    };
    switch (userVehicles.get(caller)) {
      case (?arr) arr;
      case null [];
    };
  };

  public shared ({ caller }) func removeVehicle(vehicleId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove vehicles");
    };
    let existing = switch (userVehicles.get(caller)) {
      case (?arr) arr;
      case null [];
    };
    let filtered = existing.filter(func(v : Vehicle) : Bool { v.id != vehicleId });
    userVehicles.add(caller, filtered);
  };

  // ---- Subscription Management ----

  public query ({ caller }) func getMySubscriptionStatus() : async SubscriptionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view subscription status");
    };
    let paidUntil = switch (subscriptions.get(caller)) {
      case (?t) t;
      case null 0;
    };
    let vehicleCount = switch (userVehicles.get(caller)) {
      case (?arr) arr.size();
      case null 0;
    };
    let isActive = paidUntil > Time.now();
    { paidUntil; vehicleCount; isActive };
  };

  public shared ({ caller }) func markSubscriptionPaid(userId : UserId, years : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let current = switch (subscriptions.get(userId)) {
      case (?t) if (t > Time.now()) t else Time.now();
      case null Time.now();
    };
    let oneYear : Int = 365 * 24 * 60 * 60 * 1_000_000_000;
    subscriptions.add(userId, current + oneYear * years);
  };

  public query ({ caller }) func getAllUsers() : async [{ userId: UserId; displayName: Text; subscriptionPaidUntil: Int; vehicleCount: Nat }] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    userProfiles.entries().toArray().map(func((userId, profile)) {
      let paidUntil = switch (subscriptions.get(userId)) {
        case (?t) t;
        case null 0;
      };
      let vehicleCount = switch (userVehicles.get(userId)) {
        case (?arr) arr.size();
        case null 0;
      };
      { userId; displayName = profile.displayName; subscriptionPaidUntil = paidUntil; vehicleCount };
    });
  };
};
