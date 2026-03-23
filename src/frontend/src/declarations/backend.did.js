/* eslint-disable */
// @ts-nocheck
export const idlFactory = ({ IDL }) => {
  const UserProfile = IDL.Record({ 'contactInfo' : IDL.Text, 'displayName' : IDL.Text });
  const UserRole = IDL.Variant({ 'admin' : IDL.Null, 'user' : IDL.Null, 'guest' : IDL.Null });
  const Time = IDL.Int;
  const UserId = IDL.Principal;
  const Message = IDL.Record({
    'id' : IDL.Nat,
    'text' : IDL.Text,
    'timestamp' : Time,
    'senderNote' : IDL.Opt(IDL.Text),
    'recipientId' : UserId,
  });
  const StickerOrderStatus = IDL.Variant({ 'pending' : IDL.Null, 'printed' : IDL.Null, 'mailed' : IDL.Null });
  const StickerOrder = IDL.Record({
    'orderId' : IDL.Nat,
    'userId' : UserId,
    'displayName' : IDL.Text,
    'mailingAddress' : IDL.Text,
    'vehicleDescription' : IDL.Text,
    'status' : StickerOrderStatus,
    'createdAt' : Time,
  });
  const Vehicle = IDL.Record({
    'id' : IDL.Nat,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'createdAt' : Time,
  });
  const SubscriptionStatus = IDL.Record({
    'paidUntil' : IDL.Int,
    'vehicleCount' : IDL.Nat,
    'isActive' : IDL.Bool,
  });
  const UserInfo = IDL.Record({
    'userId' : UserId,
    'displayName' : IDL.Text,
    'subscriptionPaidUntil' : IDL.Int,
    'vehicleCount' : IDL.Nat,
  });
  return IDL.Service({
    '_initializeAccessControlWithSecret' : IDL.Func([IDL.Text], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getInbox' : IDL.Func([], [IDL.Vec(Message)], ['query']),
    'getMessagesByUser' : IDL.Func([UserId], [IDL.Vec(Message)], ['query']),
    'getUserProfile' : IDL.Func([UserId], [IDL.Opt(UserProfile)], ['query']),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'sendMessage' : IDL.Func([UserId, IDL.Text, IDL.Opt(IDL.Text)], [IDL.Nat], []),
    'submitStickerOrder' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'getStickerOrders' : IDL.Func([], [IDL.Vec(StickerOrder)], ['query']),
    'updateStickerOrderStatus' : IDL.Func([IDL.Nat, StickerOrderStatus], [], []),
    'getMyOrders' : IDL.Func([], [IDL.Vec(StickerOrder)], ['query']),
    'addVehicle' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'getMyVehicles' : IDL.Func([], [IDL.Vec(Vehicle)], ['query']),
    'removeVehicle' : IDL.Func([IDL.Nat], [], []),
    'getMySubscriptionStatus' : IDL.Func([], [SubscriptionStatus], ['query']),
    'markSubscriptionPaid' : IDL.Func([UserId, IDL.Nat], [], []),
    'getAllUsers' : IDL.Func([], [IDL.Vec(UserInfo)], ['query']),
    'getAdminSetupToken' : IDL.Func([], [IDL.Text], ['query']),
    'claimAdmin' : IDL.Func([IDL.Text], [], []),
    'resetAdminSetupToken' : IDL.Func([], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
