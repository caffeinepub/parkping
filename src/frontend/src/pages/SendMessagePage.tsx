import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  Shield,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useSendMessage, useUserProfile } from "../hooks/useQueries";

const MAX_CHARS = 200;

const presetMessages = [
  "Your headlights are on 💡",
  "You're blocking someone in 🚗",
  "Your alarm is going off 🔔",
  "Your tire looks flat 🔧",
  "You left your window open 🌧️",
];

export default function SendMessagePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { to?: string };
  const recipientId = search.to || null;

  const { data: recipientProfile } = useUserProfile(recipientId);
  const sendMessage = useSendMessage();

  const [message, setMessage] = useState("");
  const [senderNote, setSenderNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!recipientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center" data-ocid="send.error_state">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-foreground">Invalid QR code</p>
          <p className="text-muted-foreground text-sm mt-1">
            This link appears to be missing a recipient.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate({ to: "/" })}
            data-ocid="send.primary_button"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    setError("");
    try {
      await sendMessage.mutateAsync({
        recipientId,
        text: message.trim(),
        senderNote: senderNote.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Failed to send message. Please try again.");
    }
  };

  const displayName = recipientProfile?.displayName || "the car owner";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="nav.link"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/image-2-1.png"
              alt="ParkPing"
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-teal-600 tracking-tight">
              ParkPing
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-teal-DEFAULT" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Send a message
                </h1>
                <p className="text-muted-foreground mt-1">
                  You're sending an anonymous message to{" "}
                  <span className="font-medium text-foreground">
                    {displayName}
                  </span>
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Quick messages
                </p>
                <div className="flex flex-wrap gap-2">
                  {presetMessages.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setMessage(preset)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        message === preset
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

              <div className="space-y-4">
                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Your message <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value.slice(0, MAX_CHARS));
                        setError("");
                      }}
                      placeholder="Type your message here..."
                      rows={4}
                      className="resize-none"
                      data-ocid="send.textarea"
                    />
                    <span
                      className={`absolute bottom-2 right-3 text-xs ${
                        message.length >= MAX_CHARS
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.length}/{MAX_CHARS}
                    </span>
                  </div>
                  {error && (
                    <p
                      className="text-destructive text-sm mt-1.5 flex items-center gap-1"
                      data-ocid="send.error_state"
                    >
                      <AlertCircle className="w-4 h-4" /> {error}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="note"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Your name (optional)
                  </Label>
                  <Input
                    id="note"
                    value={senderNote}
                    onChange={(e) => setSenderNote(e.target.value)}
                    placeholder="e.g. A concerned neighbor"
                    className="mt-1.5"
                    data-ocid="send.input"
                  />
                </div>

                <Button
                  className="w-full bg-teal-DEFAULT hover:bg-teal-dark text-white font-semibold h-12"
                  onClick={handleSubmit}
                  disabled={sendMessage.isPending}
                  data-ocid="send.submit_button"
                >
                  {sendMessage.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send Message
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Your message is anonymous. No personal information is shared.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-16"
              data-ocid="send.success_state"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-teal-DEFAULT" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Message sent!
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your message has been delivered to {displayName}. They'll see it
                in their inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage("");
                    setSenderNote("");
                  }}
                  data-ocid="send.secondary_button"
                >
                  Send another message
                </Button>
                <Button
                  className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
                  onClick={() => navigate({ to: "/" })}
                  data-ocid="send.primary_button"
                >
                  Go to ParkPing
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
