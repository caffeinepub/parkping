import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
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
    userProfiles.get(user);
  };

  public shared ({ caller }) func sendMessage(recipientId : UserId, text : Text, senderNote : ?Text) : async Nat {
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
};
