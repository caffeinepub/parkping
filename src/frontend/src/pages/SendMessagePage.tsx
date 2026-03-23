import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../backend.d";
import {
  useChatSession,
  useCreateChatSession,
  useEndChatSession,
  useSendChatMessage,
  useUserProfile,
} from "../hooks/useQueries";
import { uploadMedia } from "../utils/uploadMedia";

const STORAGE_KEY = (ownerId: string) => `parkping_chat_${ownerId}`;

const presetMessages = [
  "Your headlights are on 💡",
  "You're blocking someone in 🚗",
  "Your alarm is going off 🔔",
  "Your tire looks flat 🔧",
  "You left your window open 🌧️",
];

function formatTime(timestamp: bigint) {
  const ms = Number(timestamp / 1_000_000n);
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

export default function SendMessagePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { to?: string };
  const ownerId = search.to || null;

  const { data: ownerProfile } = useUserProfile(ownerId);
  const createSession = useCreateChatSession();
  const sendMessage = useSendChatMessage();
  const endSession = useEndChatSession();

  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (!ownerId) return null;
    return localStorage.getItem(STORAGE_KEY(ownerId));
  });

  const [chatActive, setChatActive] = useState(true);
  const { data: session, isLoading: sessionLoading } = useChatSession(
    sessionId,
    chatActive,
  );

  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // bottomRef scroll on message count change

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!text.trim() && !mediaFile) {
      setError("Please enter a message or attach a file");
      return;
    }
    if (!ownerId) return;
    setError("");

    try {
      let mediaUrl: string | undefined;
      if (mediaFile) {
        setUploading(true);
        try {
          mediaUrl = await uploadMedia(mediaFile);
        } finally {
          setUploading(false);
        }
      }

      if (!sessionId) {
        // Create a new session
        const newSessionId = await createSession.mutateAsync({
          ownerId,
          text: text.trim() || "[Media]",
          mediaUrl,
        });
        setSessionId(newSessionId);
        localStorage.setItem(STORAGE_KEY(ownerId), newSessionId);
      } else {
        await sendMessage.mutateAsync({
          sessionId,
          text: text.trim() || "[Media]",
          mediaUrl,
          fromOwner: false,
        });
      }

      setText("");
      clearMedia();
    } catch (e: any) {
      setError(e?.message || "Failed to send. Please try again.");
    }
  };

  const handleEndChat = async () => {
    if (!sessionId) return;
    try {
      await endSession.mutateAsync(sessionId);
      localStorage.removeItem(STORAGE_KEY(ownerId!));
      setChatActive(false);
    } catch (e: any) {
      setError(e?.message || "Failed to end chat.");
    }
  };

  const handleStartNewChat = () => {
    if (ownerId) localStorage.removeItem(STORAGE_KEY(ownerId));
    setSessionId(null);
    setChatActive(true);
    setText("");
    clearMedia();
    setError("");
  };

  const displayName = ownerProfile?.displayName || "the vehicle owner";
  const isPending =
    createSession.isPending || sendMessage.isPending || uploading;
  const chatEnded = session?.ended === true;

  if (!ownerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center" data-ocid="send.error_state">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-foreground">Invalid QR code</p>
          <p className="text-muted-foreground text-sm mt-1">
            This link appears to be missing a recipient.
          </p>
          <Button
            className="mt-4 bg-teal-DEFAULT hover:bg-teal-dark text-white"
            onClick={() => navigate({ to: "/" })}
            data-ocid="send.primary_button"
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
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="nav.link"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img
              src="/assets/uploads/image-019d1bf4-5028-7557-a9f9-befc1d4e24fa-1.png"
              alt="ParkPing"
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-teal-600 tracking-tight">
              ParkPing
            </span>
          </div>
          {sessionId && !chatEnded && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndChat}
              disabled={endSession.isPending}
              className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs"
              data-ocid="send.delete_button"
            >
              {endSession.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "End Chat"
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4">
        {/* Recipient info */}
        <div className="py-4 text-center border-b border-border">
          <p className="text-sm text-muted-foreground">
            Anonymous chat with{" "}
            <span className="font-semibold text-foreground">{displayName}</span>
          </p>
          {chatEnded && (
            <p
              className="mt-1 text-xs text-red-500 font-medium"
              data-ocid="send.error_state"
            >
              This chat has ended
            </p>
          )}
        </div>

        {/* Quick preset buttons - show when no session yet */}
        {!sessionId && (
          <div className="pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Quick messages
            </p>
            <div className="flex flex-wrap gap-2">
              {presetMessages.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setText(preset)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    text === preset
                      ? "bg-teal-DEFAULT text-white border-teal-DEFAULT"
                      : "bg-white text-foreground border-border hover:border-teal-DEFAULT hover:text-teal-DEFAULT"
                  }`}
                  data-ocid="send.toggle"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 py-4 min-h-[300px]">
          {sessionLoading && sessionId ? (
            <div
              className="flex justify-center py-8"
              data-ocid="send.loading_state"
            >
              <Loader2 className="w-6 h-6 text-teal-DEFAULT animate-spin" />
            </div>
          ) : session && session.messages.length > 0 ? (
            <div className="space-y-3">
              {[...session.messages]
                .sort((a, b) => Number(a.timestamp - b.timestamp))
                .map((msg: ChatMessage, idx) => (
                  <motion.div
                    key={String(msg.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx < 5 ? 0 : 0.1 }}
                    className={`flex ${
                      msg.fromOwner ? "justify-start" : "justify-end"
                    }`}
                    data-ocid={`send.item.${idx + 1}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.fromOwner
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-teal-DEFAULT text-white rounded-tr-sm"
                      }`}
                    >
                      {msg.text && msg.text !== "[Media]" && (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      )}
                      {msg.mediaUrl && isImageUrl(msg.mediaUrl) && (
                        <img
                          src={msg.mediaUrl}
                          alt="Shared media"
                          className="rounded-lg mt-1 max-w-full max-h-48 object-cover"
                        />
                      )}
                      {msg.mediaUrl && isVideoUrl(msg.mediaUrl) && (
                        // biome-ignore lint/a11y/useMediaCaption: chat video
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="rounded-lg mt-1 max-w-full max-h-48"
                        />
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          msg.fromOwner
                            ? "text-muted-foreground"
                            : "text-white/70"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              <div ref={bottomRef} />
            </div>
          ) : !sessionId ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="send.empty_state"
            >
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Send a message to start the chat</p>
            </div>
          ) : null}

          {/* Chat ended state */}
          <AnimatePresence>
            {chatEnded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 text-center"
                data-ocid="send.success_state"
              >
                <p className="text-sm text-muted-foreground">
                  The chat has ended.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                  onClick={handleStartNewChat}
                  data-ocid="send.secondary_button"
                >
                  Start New Chat
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Input area */}
        {!chatEnded && (
          <div className="border-t border-border py-3 space-y-2">
            {/* Media preview */}
            {mediaPreview && (
              <div className="relative inline-block">
                {mediaFile?.type.startsWith("image/") ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {error && (
              <p
                className="text-destructive text-xs flex items-center gap-1"
                data-ocid="send.error_state"
              >
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}

            <div className="flex gap-2 items-end">
              {/* Attach media */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-9 h-9 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="send.upload_button"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError("");
                }}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                data-ocid="send.input"
                disabled={isPending}
              />

              <Button
                onClick={handleSend}
                disabled={isPending}
                className="flex-shrink-0 w-9 h-9 p-0 bg-teal-DEFAULT hover:bg-teal-dark text-white rounded-full"
                data-ocid="send.submit_button"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Messages are anonymous. No personal information is shared.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
