import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  type OldUserProfile = {
    displayName : Text;
    contactInfo : Text;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
  };

  type NewUserProfile = {
    displayName : Text;
    contactInfo : Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_user, oldProfile) {
        { oldProfile with profilePicture = null };
      }
    );
    { userProfiles = newUserProfiles };
  };
};
