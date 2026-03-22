import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  Copy,
  Download,
  Edit2,
  Inbox,
  Loader2,
  LogOut,
  Shield,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useInbox,
  useSaveProfile,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatters";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { identity, clear } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText() ?? null;
  const qrUrl = principal
    ? `${window.location.origin}/send?to=${principal}`
    : "";
  const qrApiUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`
    : "";

  const { data: messages, isLoading: inboxLoading } = useInbox();
  const { data: profile, isLoading: profileLoading } = useCallerProfile();
  const saveProfile = useSaveProfile();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [copied, setCopied] = useState(false);

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
            <div className="w-9 h-9 rounded-lg bg-teal-DEFAULT flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">ParkPing</span>
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
                    className="flex-1"
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
              </CardContent>
            </Card>

            {/* Inbox Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-teal-DEFAULT" />
                    Messages
                  </span>
                  {messages && messages.length > 0 && (
                    <Badge
                      className="bg-teal-DEFAULT text-white"
                      data-ocid="inbox.badge"
                    >
                      {messages.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inboxLoading ? (
                  <div className="space-y-4" data-ocid="inbox.loading_state">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div
                    className="text-center py-12"
                    data-ocid="inbox.empty_state"
                  >
                    <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      No messages yet
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Share your QR code to start receiving messages
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {[...messages]
                      .sort((a, b) => Number(b.timestamp - a.timestamp))
                      .map((msg, idx) => (
                        <motion.div
                          key={String(msg.id)}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-muted rounded-xl p-4"
                          data-ocid={`inbox.item.${idx + 1}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground text-sm leading-relaxed">
                                {msg.text}
                              </p>
                              {msg.senderNote && (
                                <p className="text-muted-foreground text-xs mt-1 italic">
                                  {msg.senderNote}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatRelativeTime(msg.timestamp)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
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
