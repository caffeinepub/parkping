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
    contactInfo : Text; // e.g. phone number or email
  };

  public type Message = {
    id : Nat;
    recipientId : UserId;
    text : Text;
    timestamp : Time.Time;
    senderNote : ?Text;
  };

  module Message {
    func compareByTimestampAsc(a : Message, b : Message) : Order.Order {
      Nat.compare(b.id, a.id);
    };

    public func compareByTimestampDesc(a : Message, b : Message) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  var nextMessageId = 0;
  let messages = Map.empty<Nat, Message>();

  let userProfiles = Map.empty<UserId, UserProfile>();

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

  // Public function - anyone can check if a user exists (for QR code scanning)
  // This allows anonymous users to verify a user exists before sending a message
  public query ({ caller }) func getUserProfile(user : UserId) : async ?UserProfile {
    // No authorization check - this is intentionally public for QR code lookup
    userProfiles.get(user);
  };

  // Public function - anyone (authenticated or not) can send messages
  // This is the core feature: scan QR code and send message without needing an account
  public shared ({ caller }) func sendMessage(recipientId : UserId, text : Text, senderNote : ?Text) : async Nat {
    // No authorization check - anyone can send messages (core feature)
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

  // Users can only view their own inbox
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

  // Users can only view their own messages, admins can view any user's messages
  public query ({ caller }) func getMessagesByUser(recipientId : UserId) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    // Privacy check: users can only view their own messages, unless they are admin
    if (caller != recipientId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own messages");
    };

    messages.values().toArray().filter(
      func(m) { m.recipientId == recipientId }
    ).sort(
      Message.compareByTimestampDesc
    );
  };
};
