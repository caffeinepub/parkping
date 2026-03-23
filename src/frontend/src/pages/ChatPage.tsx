import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActorWithConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMediaUpload } from "../hooks/useMediaUpload";

type Message = {
  id: bigint;
  sessionId: bigint;
  senderRole: { owner: null } | { sender: null };
  text: string;
  mediaUrl: string | null | [string];
  timestamp: bigint;
};

function unwrapMediaUrl(
  raw: string | null | [string] | undefined,
): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function isImage(url: string): boolean {
  return (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url) || url.includes("image")
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    session?: string;
    token?: string;
  };
  const sessionId = search.session ? BigInt(search.session) : null;
  const senderToken = search.token || null;

  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { uploadMedia, uploading } = useMediaUpload();

  const isOwner = !senderToken && !!identity;
  const isSender = !!senderToken;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Invalid chat session");
      return;
    }
    const doFetch = async () => {
      if (!sessionId) return;
      if (isOwner && !actor) return; // wait for actor to load
      try {
        let actorToUse: any;
        if (isOwner && actor) {
          actorToUse = actor;
        } else {
          actorToUse = await createActorWithConfig();
        }
        const msgs = await (actorToUse as any).getChatMessages(
          sessionId,
          senderToken ? [senderToken] : [],
        );
        setMessages(msgs as Message[]);
        setError("");
        setTimeout(() => {
          if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      } catch (e: any) {
        if (!isEnded) setError(e?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };
    doFetch();
    const interval = setInterval(doFetch, 3000);
    return () => clearInterval(interval);
  }, [sessionId, isOwner, actor, senderToken, isEnded]);

  const handleSend = async () => {
    if (!text.trim() && !pendingMedia) return;
    if (!sessionId) return;
    setSending(true);
    try {
      let mediaUrl: string | null = null;
      if (pendingMedia) {
        mediaUrl = await uploadMedia(pendingMedia.file);
      }

      let actorToUse: any;
      if (isOwner && actor) {
        actorToUse = actor;
      } else {
        actorToUse = await createActorWithConfig();
      }

      if (isOwner) {
        await (actorToUse as any).sendOwnerChatMessage(
          sessionId,
          text.trim(),
          mediaUrl ? [mediaUrl] : [],
        );
      } else if (isSender && senderToken) {
        await (actorToUse as any).sendSenderChatMessage(
          sessionId,
          senderToken,
          text.trim(),
          mediaUrl ? [mediaUrl] : [],
        );
      }

      setText("");
      setPendingMedia(null);
      // Refresh messages inline
      try {
        let actorToUse2: any;
        if (isOwner && actor) {
          actorToUse2 = actor;
        } else {
          actorToUse2 = await createActorWithConfig();
        }
        const msgs = await (actorToUse2 as any).getChatMessages(
          sessionId,
          senderToken ? [senderToken] : [],
        );
        setMessages(msgs as Message[]);
        setTimeout(() => {
          if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      } catch {
        /* ignore refresh error */
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!sessionId) return;
    try {
      let actorToUse: any;
      if (isOwner && actor) {
        actorToUse = actor;
      } else {
        actorToUse = await createActorWithConfig();
      }
      await (actorToUse as any).endChatSession(
        sessionId,
        senderToken ? [senderToken] : [],
      );
      setIsEnded(true);
      setEndDialogOpen(false);
      toast.success("Chat ended");
    } catch (e: any) {
      toast.error(e?.message || "Failed to end chat");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPendingMedia({ file, preview });
  };

  const formatTime = (ts: bigint) =>
    new Date(Number(ts / 1_000_000n)).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center" data-ocid="chat.error_state">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="font-semibold">Invalid chat session</p>
          <Button
            className="mt-4"
            onClick={() => navigate({ to: "/" })}
            data-ocid="chat.primary_button"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: isOwner ? "/dashboard" : "/" })}
              className="text-muted-foreground hover:text-foreground"
              data-ocid="nav.link"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/assets/uploads/image-019d1cbb-24e0-7038-9daf-a5abc2143997-1.png"
                alt="ParkPing"
                className="h-7 w-auto"
              />
              <span className="font-bold text-teal-600">ParkPing</span>
            </div>
            <span className="text-muted-foreground text-sm hidden sm:inline">
              — {isOwner ? "Vehicle Owner" : "Sender"} Chat
            </span>
          </div>

          <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={isEnded}
                data-ocid="chat.open_modal_button"
              >
                <X className="w-4 h-4 mr-1" /> End Chat
              </Button>
            </DialogTrigger>
            <DialogContent data-ocid="chat.dialog">
              <DialogHeader>
                <DialogTitle>End this conversation?</DialogTitle>
                <DialogDescription>
                  This will close the chat for both parties. You won't be able
                  to send or receive new messages.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEndDialogOpen(false)}
                  data-ocid="chat.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEndChat}
                  data-ocid="chat.confirm_button"
                >
                  End Chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Chat body */}
      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col px-4 py-4 gap-4">
        {isEnded && (
          <div
            className="bg-muted text-muted-foreground text-center text-sm py-3 rounded-xl"
            data-ocid="chat.error_state"
          >
            This conversation has ended.
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 pb-2"
          style={{ minHeight: 300, maxHeight: "calc(100vh - 280px)" }}
          data-ocid="chat.panel"
        >
          {loading ? (
            <div className="space-y-3" data-ocid="chat.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div
              className="text-center py-10 text-destructive"
              data-ocid="chat.error_state"
            >
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="chat.empty_state"
            >
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation below.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = isOwner
                ? "owner" in msg.senderRole
                : "sender" in msg.senderRole;
              const media = unwrapMediaUrl(msg.mediaUrl);

              return (
                <div
                  key={String(msg.id)}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  data-ocid={`chat.item.${idx + 1}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isMine
                        ? "bg-teal-600 text-white rounded-br-sm"
                        : "bg-white border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {media && (
                      <div className="mb-2">
                        {isImage(media) ? (
                          <img
                            src={media}
                            alt="media"
                            className="rounded-lg max-w-full max-h-48 object-cover"
                          />
                        ) : (
                          <video
                            src={media}
                            controls
                            className="rounded-lg max-w-full max-h-48"
                          >
                            <track kind="captions" />
                          </video>
                        )}
                      </div>
                    )}
                    {msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        isMine ? "text-teal-100" : "text-muted-foreground"
                      }`}
                    >
                      {"owner" in msg.senderRole ? "Owner" : "Sender"} ·{" "}
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Media preview */}
        {pendingMedia && (
          <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
            {isImage(pendingMedia.file.type) ? (
              <img
                src={pendingMedia.preview}
                alt="preview"
                className="h-16 w-16 object-cover rounded-lg"
              />
            ) : (
              <video
                src={pendingMedia.preview}
                className="h-16 w-16 object-cover rounded-lg"
              >
                <track kind="captions" />
              </video>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {pendingMedia.file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(pendingMedia.file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingMedia(null)}
              className="text-muted-foreground hover:text-foreground"
              data-ocid="chat.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 bg-white border border-border rounded-2xl px-3 py-2 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={isEnded || sending || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-teal-600 transition-colors disabled:opacity-40 p-1"
            data-ocid="chat.upload_button"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isEnded ? "This conversation has ended" : "Type a message..."
            }
            disabled={isEnded || sending || uploading}
            className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            data-ocid="chat.input"
          />
          <Button
            size="sm"
            disabled={
              isEnded || sending || uploading || (!text.trim() && !pendingMedia)
            }
            onClick={handleSend}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-3"
            data-ocid="chat.submit_button"
          >
            {sending || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
