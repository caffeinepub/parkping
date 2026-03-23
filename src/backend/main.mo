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

  // Returns the setup token. Public when no admin assigned yet; admin-only afterward.
  public query ({ caller }) func getAdminSetupToken() : async Text {
    if (not accessControlState.adminAssigned or AccessControl.isAdmin(accessControlState, caller)) {
      adminSetupToken
    } else {
      Runtime.trap("Unauthorized: Admin only")
    }
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
    adminSetupToken
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

  public query func getUserProfile(user : UserId) : async ?UserProfile {
    userProfiles.get(user);
  };

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

  // Subscription management
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

  // Admin: mark subscription paid for a user (adds years from now)
  public shared ({ caller }) func markSubscriptionPaid(userId : UserId, years : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let current = switch (subscriptions.get(userId)) {
      case (?t) if (t > Time.now()) t else Time.now();
      case null Time.now();
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
