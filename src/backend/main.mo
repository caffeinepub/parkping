import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Blob "mo:core/Blob";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";
import MixinStorage "blob-storage/Mixin";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type UserId = Principal;

  public type UserProfile = {
    displayName : Text;
    contactInfo : Text;
    // Add profile picture field directly if you want it persisted as part of your user profile.
    // Alternatively, keep this out of contracts and manage in frontend.
    profilePicture : ?Storage.ExternalBlob;
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

  public type ChatMessage = {
    id : Nat;
    text : Text;
    mediaUrl : ?Text;
    fromOwner : Bool;
    timestamp : Time.Time;
  };

  public type ChatSession = {
    id : Text;
    ownerId : UserId;
    senderId : ?UserId;
    createdAt : Time.Time;
    ended : Bool;
    messages : [ChatMessage];
    unreadByOwner : Bool;
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

  // Admin setup token for /claim-admin flow
  var adminSetupToken : Text = "parkping-admin-setup";
  var adminTokenVersion : Nat = 1;

  // Chat sessions
  let chatSessions = Map.empty<Text, ChatSession>();
  var nextChatMessageId = 0;

  // Returns the setup token. Public when no admin assigned yet; admin-only afterward.
  public query ({ caller }) func getAdminSetupToken() : async Text {
    if (not accessControlState.adminAssigned) {
      adminSetupToken
    } else if (AccessControl.isAdmin(accessControlState, caller)) {
      adminSetupToken
    } else {
      Runtime.trap("Unauthorized: Admin only")
    };
  };

  // Claim admin using the setup token. Rotates the token after use.
  public shared ({ caller }) func claimAdmin(token : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to claim admin");
    };
    if (token != adminSetupToken) {
      Runtime.trap("Invalid admin setup token");
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    // Rotate token after successful claim
    adminTokenVersion += 1;
    adminSetupToken := "parkping-admin-" # adminTokenVersion.toText();
  };

  // Admin-only: reset the setup token (returns new token).
  public shared ({ caller }) func resetAdminSetupToken() : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    adminTokenVersion += 1;
    adminSetupToken := "parkping-admin-" # adminTokenVersion.toText();
    adminSetupToken;
  };

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

  public query ({ caller }) func getUserProfile(user : UserId) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile or admin can view all");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func sendMessage(recipientId : UserId, text : Text, senderNote : ?Text) : async Nat {
    // Allow any authenticated user (including guests) to send messages
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

  public shared ({ caller }) func submitStickerOrder(mailingAddress : Text, vehicleDescription : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit sticker orders");
    };
    let displayName = switch (userProfiles.get(caller)) {
      case (?p) { p.displayName };
      case (null) { "" };
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
      case (null) Runtime.trap("Order not found");
    };
  };

  public query ({ caller }) func getMyOrders() : async [StickerOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    stickerOrders.values().toArray().filter(func(o) { o.userId == caller });
  };

  // Vehicle management
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
      case (?arr) { arr };
      case (null) { [] };
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
      case (?arr) { arr };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func removeVehicle(vehicleId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove vehicles");
    };
    let existing = switch (userVehicles.get(caller)) {
      case (?arr) { arr };
      case (null) { [] };
    };
    let filtered = existing.filter(func(v : Vehicle) : Bool { v.id != vehicleId });
    userVehicles.add(caller, filtered);
  };

  // Subscription management
  public query ({ caller }) func getMySubscriptionStatus() : async SubscriptionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view subscription status");
    };
    let paidUntil = switch (subscriptions.get(caller)) {
      case (?t) { t };
      case (null) { 0 };
    };
    let vehicleCount = switch (userVehicles.get(caller)) {
      case (?arr) { arr.size() };
      case (null) { 0 };
    };
    let isActive = paidUntil > Time.now();
    { paidUntil; vehicleCount; isActive };
  };

  // Admin: mark subscription paid for a user (adds years from now)
  public shared ({ caller }) func markSubscriptionPaid(userId : UserId, years : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let current = switch (subscriptions.get(userId)) {
      case (?t) { if (t > Time.now()) { t } else { Time.now() } };
      case (null) { Time.now() };
    };
    // 1 year = 365 * 24 * 60 * 60 * 1_000_000_000 nanoseconds
    let oneYear : Int = 365 * 24 * 60 * 60 * 1_000_000_000;
    subscriptions.add(userId, current + oneYear * years);
  };

  // Admin: get all users with subscription info
  public query ({ caller }) func getAllUsers() : async [{ userId: UserId; displayName: Text; subscriptionPaidUntil: Int; vehicleCount: Nat }] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    userProfiles.entries().toArray().map(func((userId, profile)) {
      let paidUntil = switch (subscriptions.get(userId)) {
        case (?t) { t };
        case (null) { 0 };
      };
      let vehicleCount = switch (userVehicles.get(userId)) {
        case (?arr) { arr.size() };
        case (null) { 0 };
      };
      { userId; displayName = profile.displayName; subscriptionPaidUntil = paidUntil; vehicleCount };
    });
  };

  // Chat Sessions Implementation

  // Helper to generate unique session ID
  func generateSessionId() : Text {
    let timestamp = Time.now().toText();
    let random = nextChatMessageId.toText();
    timestamp # "-" # random;
  };

  // Create a new chat session (called when someone scans QR and sends first message)
  // Anyone can create a session (including guests/anonymous for QR scanning)
  public shared ({ caller }) func createChatSession(ownerId : UserId, initialText : Text, initialMediaUrl : ?Text) : async Text {
    let sessionId = generateSessionId();
    let messageId = nextChatMessageId;
    nextChatMessageId += 1;

    let initialMessage : ChatMessage = {
      id = messageId;
      text = initialText;
      mediaUrl = initialMediaUrl;
      fromOwner = false;
      timestamp = Time.now();
    };

    let session : ChatSession = {
      id = sessionId;
      ownerId;
      senderId = if (caller.isAnonymous()) { null } else { ?caller };
      createdAt = Time.now();
      ended = false;
      messages = [initialMessage];
      unreadByOwner = true;
    };

    chatSessions.add(sessionId, session);
    sessionId;
  };

  // Get a chat session - only owner or sender can access
  public query ({ caller }) func getChatSession(sessionId : Text) : async ChatSession {
    switch (chatSessions.get(sessionId)) {
      case (?session) {
        let isOwner = caller == session.ownerId;
        let isSender = switch (session.senderId) {
          case (?sid) { caller == sid };
          case (null) { false };
        };

        if (not (isOwner or isSender)) {
          Runtime.trap("Unauthorized: Only session owner or sender can access this session");
        };
        session;
      };
      case (null) Runtime.trap("Chat session not found");
    };
  };

  // Send a message in a chat session - only owner or sender
  public shared ({ caller }) func sendChatMessage(sessionId : Text, text : Text, mediaUrl : ?Text, fromOwner : Bool) : async Nat {
    switch (chatSessions.get(sessionId)) {
      case (?session) {
        if (session.ended) {
          Runtime.trap("Cannot send message: chat session has ended");
        };

        let isOwner = caller == session.ownerId;
        let isSender = switch (session.senderId) {
          case (?sid) { caller == sid };
          case (null) { false };
        };

        if (not (isOwner or isSender)) {
          Runtime.trap("Unauthorized: Only session owner or sender can send messages");
        };

        // Verify fromOwner flag matches caller
        if (fromOwner and not isOwner) {
          Runtime.trap("Unauthorized: Only owner can send messages as owner");
        };
        if (not fromOwner and not isSender) {
          Runtime.trap("Unauthorized: Only sender can send messages as sender");
        };

        let messageId = nextChatMessageId;
        nextChatMessageId += 1;

        let newMessage : ChatMessage = {
          id = messageId;
          text;
          mediaUrl;
          fromOwner;
          timestamp = Time.now();
        };

        let updatedSession : ChatSession = {
          id = session.id;
          ownerId = session.ownerId;
          senderId = session.senderId;
          createdAt = session.createdAt;
          ended = session.ended;
          messages = session.messages.concat([newMessage]);
          unreadByOwner = if (fromOwner) { false } else { true };
        };

        chatSessions.add(sessionId, updatedSession);
        messageId;
      };
      case (null) Runtime.trap("Chat session not found");
    };
  };

  // End a chat session - only owner or sender
  public shared ({ caller }) func endChatSession(sessionId : Text) : async () {
    switch (chatSessions.get(sessionId)) {
      case (?session) {
        let isOwner = caller == session.ownerId;
        let isSender = switch (session.senderId) {
          case (?sid) { caller == sid };
          case (null) { false };
        };

        if (not (isOwner or isSender)) {
          Runtime.trap("Unauthorized: Only session owner or sender can end this session");
        };

        let updatedSession : ChatSession = {
          id = session.id;
          ownerId = session.ownerId;
          senderId = session.senderId;
          createdAt = session.createdAt;
          ended = true;
          messages = session.messages;
          unreadByOwner = session.unreadByOwner;
        };

        chatSessions.add(sessionId, updatedSession);
      };
      case (null) Runtime.trap("Chat session not found");
    };
  };

  // Get all chat sessions for the owner (inbox)
  public query ({ caller }) func getOwnerChatSessions() : async [ChatSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their chat sessions");
    };
    chatSessions.values().toArray().filter(func(s) { s.ownerId == caller });
  };

  // Mark a session as read by owner
  public shared ({ caller }) func markSessionRead(sessionId : Text) : async () {
    switch (chatSessions.get(sessionId)) {
      case (?session) {
        if (caller != session.ownerId) {
          Runtime.trap("Unauthorized: Only session owner can mark as read");
        };

        let updatedSession : ChatSession = {
          id = session.id;
          ownerId = session.ownerId;
          senderId = session.senderId;
          createdAt = session.createdAt;
          ended = session.ended;
          messages = session.messages;
          unreadByOwner = false;
        };

        chatSessions.add(sessionId, updatedSession);
      };
      case (null) Runtime.trap("Chat session not found");
    };
  };

  // Stripe payment integration

  var stripeConfig : ?Stripe.StripeConfiguration = null;

  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  func getStripeConfig() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured") };
      case (?c) { c };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfig(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfig(), caller, items, successUrl, cancelUrl, transform);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
