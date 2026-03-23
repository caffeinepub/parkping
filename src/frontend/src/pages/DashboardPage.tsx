import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  BellRing,
  Car,
  Check,
  Copy,
  Download,
  Edit2,
  Inbox,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  Printer,
  Shield,
  Sticker,
  Trash2,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMessagePoller } from "../hooks/useMessagePoller";
import { useNotifications } from "../hooks/useNotifications";
import {
  type StickerOrderStatus,
  type Vehicle,
  useAddVehicle,
  useCallerProfile,
  useInbox,
  useMyOrders,
  useMyVehicles,
  useRemoveVehicle,
  useSaveProfile,
  useSubmitStickerOrder,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatters";

function getStatusLabel(status: StickerOrderStatus): string {
  if ("pending" in status) return "Pending";
  if ("printed" in status) return "Printed";
  if ("mailed" in status) return "Mailed";
  return "Unknown";
}

function getStatusVariant(
  status: StickerOrderStatus,
): "default" | "secondary" | "outline" {
  if ("pending" in status) return "secondary";
  if ("printed" in status) return "default";
  if ("mailed" in status) return "outline";
  return "secondary";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { identity, clear } = useInternetIdentity();
  const { actor } = useActor();
  const principal = identity?.getPrincipal().toText() ?? null;
  const qrUrl = principal
    ? `${window.location.origin}/send?to=${principal}`
    : "";
  const qrApiUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`
    : "";

  useInbox();
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const { data: profile, isLoading: profileLoading } = useCallerProfile();
  const saveProfile = useSaveProfile();
  const { data: myOrders, isLoading: ordersLoading } = useMyOrders();
  const submitOrder = useSubmitStickerOrder();
  const { data: myVehicles, isLoading: vehiclesLoading } = useMyVehicles();
  const addVehicle = useAddVehicle();
  const removeVehicle = useRemoveVehicle();

  // Notifications
  const { supported, permission, requestPermission } = useNotifications();
  useMessagePoller({
    actor,
    notificationsGranted: permission === "granted",
    enabled: !!actor && !!identity,
  });

  // Load chat sessions
  useEffect(() => {
    if (!actor || !identity) return;
    const loadSessions = async () => {
      try {
        const sessions = await (actor as any).getOwnerChatSessions();
        setChatSessions(sessions);
      } catch {
        // ignore
      } finally {
        setSessionsLoading(false);
      }
    };
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [actor, identity]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mailingAddress, setMailingAddress] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleDesc, setNewVehicleDesc] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  if (!identity) {
    navigate({ to: "/" });
    return null;
  }

  const displayName = profile?.displayName || "Car Owner";

  const handleEditName = () => {
    setNameInput(profile?.displayName || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      await saveProfile.mutateAsync({
        displayName: nameInput.trim(),
        contactInfo: profile?.contactInfo || "",
      });
      setEditingName(false);
      toast.success("Display name updated!");
    } catch {
      toast.error("Failed to save name");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrApiUrl;
    link.download = "parkping-qr.png";
    link.click();
  };

  const handleLogout = () => {
    clear();
    navigate({ to: "/" });
  };

  const handleSubmitOrder = async () => {
    if (!mailingAddress.trim() || !vehicleDescription.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await submitOrder.mutateAsync({
        mailingAddress: mailingAddress.trim(),
        vehicleDescription: vehicleDescription.trim(),
      });
      setOrderSubmitted(true);
      setMailingAddress("");
      setVehicleDescription("");
      toast.success("Sticker order submitted! We'll mail it to you soon.");
    } catch {
      toast.error("Failed to submit order");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-2"
            data-ocid="nav.link"
          >
            <img
              src="/assets/uploads/image-019d1cbb-24e0-7038-9daf-a5abc2143997-1.png"
              alt="ParkPing"
              className="h-9 w-auto"
            />
            <span className="text-xl font-bold text-teal-600 tracking-tight">
              ParkPing
            </span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="max-w-[140px] truncate">{displayName}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              data-ocid="nav.secondary_button"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Your Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your parking QR code and read your messages.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* QR Code Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCodeIcon />
                  Your Parking QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Display name
                  </Label>
                  {editingName ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your name"
                        className="flex-1"
                        data-ocid="dashboard.input"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={saveProfile.isPending}
                        data-ocid="dashboard.save_button"
                      >
                        {saveProfile.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingName(false)}
                        data-ocid="dashboard.cancel_button"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {profileLoading ? "Loading..." : displayName}
                      </span>
                      <button
                        type="button"
                        onClick={handleEditName}
                        className="text-muted-foreground hover:text-foreground"
                        data-ocid="dashboard.edit_button"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  {qrApiUrl ? (
                    <div className="p-4 bg-white rounded-2xl border border-border shadow-inner">
                      <img
                        src={qrApiUrl}
                        alt="Your ParkPing QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  ) : (
                    <Skeleton
                      className="w-48 h-48 rounded-2xl"
                      data-ocid="dashboard.loading_state"
                    />
                  )}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Print this QR code and place it on your car dashboard
                </p>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-teal-DEFAULT hover:bg-teal-dark text-white"
                    onClick={handleDownloadQR}
                    data-ocid="dashboard.primary_button"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                    onClick={handleCopyLink}
                    data-ocid="dashboard.secondary_button"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-teal-DEFAULT" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>

                {qrUrl && (
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground break-all">
                      {qrUrl}
                    </p>
                  </div>
                )}

                {/* Print Temporary Sticker */}
                <div className="border-t border-border pt-4">
                  <Button
                    variant="outline"
                    className="w-full border-teal-DEFAULT text-teal-DEFAULT hover:bg-teal-DEFAULT hover:text-white transition-colors"
                    onClick={() => navigate({ to: "/print-sticker" })}
                    data-ocid="dashboard.print_button"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Temporary Sticker
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Print a temporary sticker while you wait for your physical
                    one
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Inbox Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-teal-DEFAULT" />
                    Chat Sessions
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Notification permission badge/button */}
                    {supported && permission === "default" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-teal-DEFAULT text-teal-DEFAULT hover:bg-teal-DEFAULT hover:text-white transition-colors gap-1"
                        onClick={requestPermission}
                        data-ocid="inbox.enable_notifications_button"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        Enable Notifications
                      </Button>
                    )}
                    {supported && permission === "granted" && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5"
                        data-ocid="inbox.notifications_on_badge"
                      >
                        <BellRing className="w-3 h-3" />
                        Notifications on
                      </span>
                    )}
                    {supported && permission === "denied" && (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        data-ocid="inbox.notifications_blocked_badge"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        Notifications blocked
                      </span>
                    )}
                    {chatSessions.filter((s) => s.isActive).length > 0 && (
                      <Badge
                        className="bg-teal-DEFAULT text-white"
                        data-ocid="inbox.badge"
                      >
                        {chatSessions.filter((s) => s.isActive).length}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-4" data-ocid="inbox.loading_state">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div
                    className="text-center py-12"
                    data-ocid="inbox.empty_state"
                  >
                    <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      No chat sessions yet
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Share your QR code to start receiving messages
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {[...chatSessions]
                      .sort((a, b) => Number(b.lastMessageAt - a.lastMessageAt))
                      .map((session, idx) => (
                        <motion.div
                          key={String(session.id)}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-muted rounded-xl p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() =>
                            navigate({ to: `/chat?session=${session.id}` })
                          }
                          data-ocid={`inbox.item.${idx + 1}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-DEFAULT/10 flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="w-4 h-4 text-teal-DEFAULT" />
                              </div>
                              <div>
                                <p className="text-foreground text-sm font-medium">
                                  Chat #{String(session.id)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Started{" "}
                                  {new Date(
                                    Number(session.startedAt / 1_000_000n),
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {session.isActive ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted border border-border rounded-full px-2.5 py-0.5">
                                  Ended
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticker Order Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 grid lg:grid-cols-2 gap-8"
          >
            {/* Order Form */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sticker className="w-5 h-5 text-teal-DEFAULT" />
                  Order a Physical Sticker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {orderSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                    data-ocid="sticker_order.success_state"
                  >
                    <div className="w-14 h-14 rounded-full bg-teal-DEFAULT/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-7 h-7 text-teal-DEFAULT" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      Order Submitted!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      We'll print your QR sticker and mail it to you. Check the
                      status below.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                      onClick={() => setOrderSubmitted(false)}
                      data-ocid="sticker_order.secondary_button"
                    >
                      Place Another Order
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      We'll print your QR code on a weatherproof sticker and
                      mail it directly to you.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle-desc">Vehicle Description</Label>
                      <Input
                        id="vehicle-desc"
                        placeholder="e.g. Red Toyota Camry, 2018"
                        value={vehicleDescription}
                        onChange={(e) => setVehicleDescription(e.target.value)}
                        data-ocid="sticker_order.input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mailing-address">Mailing Address</Label>
                      <Textarea
                        id="mailing-address"
                        placeholder="123 Main St&#10;City, State ZIP&#10;Country"
                        value={mailingAddress}
                        onChange={(e) => setMailingAddress(e.target.value)}
                        rows={4}
                        data-ocid="sticker_order.textarea"
                      />
                    </div>
                    <Button
                      className="w-full bg-teal-DEFAULT hover:bg-teal-dark text-white"
                      onClick={handleSubmitOrder}
                      disabled={submitOrder.isPending}
                      data-ocid="sticker_order.submit_button"
                    >
                      {submitOrder.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4 mr-2" />
                      )}
                      {submitOrder.isPending
                        ? "Submitting..."
                        : "Request Sticker"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* My Orders */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-DEFAULT" />
                  My Sticker Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-3" data-ocid="orders.loading_state">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : !myOrders || myOrders.length === 0 ? (
                  <div
                    className="text-center py-10"
                    data-ocid="orders.empty_state"
                  >
                    <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium text-sm">
                      No orders yet
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Request a physical sticker using the form
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myOrders.map((order, idx) => (
                      <motion.div
                        key={String(order.orderId)}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-muted rounded-xl p-4"
                        data-ocid={`orders.item.${idx + 1}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {order.vehicleDescription}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {order.mailingAddress}
                            </p>
                          </div>
                          <Badge
                            variant={getStatusVariant(order.status)}
                            className={
                              "mailed" in order.status
                                ? "bg-teal-DEFAULT text-white"
                                : ""
                            }
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* My Vehicles Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-8"
          >
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-teal-DEFAULT" />
                  My Vehicles
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Base subscription: $9.99/year. Each additional vehicle:
                  $9.99/year.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {vehiclesLoading ? (
                  <div className="space-y-3" data-ocid="vehicles.loading_state">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Primary QR (base vehicle) */}
                    <div className="bg-muted rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-shrink-0">
                          {qrApiUrl && (
                            <img
                              src={qrApiUrl}
                              alt="Primary Vehicle QR"
                              className="w-28 h-28 rounded-lg border border-border"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              Primary Vehicle
                            </span>
                            <Badge className="bg-teal-DEFAULT/10 text-teal-DEFAULT border-0 text-xs">
                              Base
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Your default parking QR code
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
                              onClick={handleDownloadQR}
                              data-ocid="vehicles.primary_button"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                              onClick={handleCopyLink}
                              data-ocid="vehicles.secondary_button"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Vehicles */}
                    {myVehicles && myVehicles.length > 0 ? (
                      <div className="space-y-3">
                        {myVehicles.map((vehicle: Vehicle, idx: number) => {
                          const vQrUrl = `${window.location.origin}/send?to=${principal}&vehicle=${vehicle.id}`;
                          const vQrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(vQrUrl)}`;
                          return (
                            <motion.div
                              key={String(vehicle.id)}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-muted rounded-xl p-4"
                              data-ocid={`vehicles.item.${idx + 1}`}
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex-shrink-0">
                                  <img
                                    src={vQrApiUrl}
                                    alt={vehicle.name}
                                    className="w-28 h-28 rounded-lg border border-border"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground mb-0.5">
                                    {vehicle.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mb-3">
                                    {vehicle.description}
                                  </p>
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
                                      onClick={() => {
                                        const link =
                                          document.createElement("a");
                                        link.href = vQrApiUrl;
                                        link.download = `parkping-${vehicle.name}.png`;
                                        link.click();
                                      }}
                                      data-ocid={`vehicles.primary_button.${idx + 1}`}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                                      onClick={() => {
                                        navigator.clipboard.writeText(vQrUrl);
                                        toast.success("Link copied!");
                                      }}
                                      data-ocid={`vehicles.secondary_button.${idx + 1}`}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy Link
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                                      onClick={async () => {
                                        try {
                                          await removeVehicle.mutateAsync(
                                            vehicle.id,
                                          );
                                          toast.success("Vehicle removed");
                                        } catch {
                                          toast.error(
                                            "Failed to remove vehicle",
                                          );
                                        }
                                      }}
                                      disabled={removeVehicle.isPending}
                                      data-ocid={`vehicles.delete_button.${idx + 1}`}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="text-center py-6 text-muted-foreground"
                        data-ocid="vehicles.empty_state"
                      >
                        <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          No extra vehicles yet. Add one below.
                        </p>
                      </div>
                    )}

                    {/* Add Vehicle Form */}
                    {showAddVehicle ? (
                      <div className="border border-border rounded-xl p-4 space-y-3">
                        <p className="font-semibold text-foreground text-sm">
                          Add New Vehicle
                        </p>
                        <div className="space-y-1">
                          <Label htmlFor="veh-name">Vehicle Name</Label>
                          <Input
                            id="veh-name"
                            placeholder="e.g. Blue Honda Civic"
                            value={newVehicleName}
                            onChange={(e) => setNewVehicleName(e.target.value)}
                            data-ocid="vehicles.input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="veh-desc">
                            Description (optional)
                          </Label>
                          <Input
                            id="veh-desc"
                            placeholder="e.g. 2020, license plate ABC123"
                            value={newVehicleDesc}
                            onChange={(e) => setNewVehicleDesc(e.target.value)}
                            data-ocid="vehicles.textarea"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
                            onClick={async () => {
                              if (!newVehicleName.trim()) {
                                toast.error("Please enter a vehicle name");
                                return;
                              }
                              try {
                                await addVehicle.mutateAsync({
                                  name: newVehicleName.trim(),
                                  description: newVehicleDesc.trim(),
                                });
                                setNewVehicleName("");
                                setNewVehicleDesc("");
                                setShowAddVehicle(false);
                                toast.success("Vehicle added!");
                              } catch {
                                toast.error("Failed to add vehicle");
                              }
                            }}
                            disabled={addVehicle.isPending}
                            data-ocid="vehicles.submit_button"
                          >
                            {addVehicle.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 mr-2" />
                            )}
                            Add Vehicle
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowAddVehicle(false)}
                            data-ocid="vehicles.cancel_button"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                        onClick={() => setShowAddVehicle(true)}
                        data-ocid="vehicles.open_modal_button"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Vehicle (+$9.99/year)
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

function QrCodeIcon() {
  return (
    <svg
      aria-label="QR Code"
      role="img"
      className="w-5 h-5 text-teal-DEFAULT"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>QR Code</title>
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}
