import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, Loader2, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAdminSetupToken, useClaimAdmin } from "../hooks/useQueries";

export default function ClaimAdminPage() {
  const navigate = useNavigate();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const claimAdmin = useClaimAdmin();
  const { data: setupToken, isLoading: tokenLoading } = useAdminSetupToken();
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyToken = async () => {
    if (!setupToken) return;
    await navigator.clipboard.writeText(setupToken);
    setCopied(true);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!identity) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <a href="/" className="flex items-center gap-2">
              <img
                src="/assets/uploads/image-019d1cbb-24e0-7038-9daf-a5abc2143997-1.png"
                alt="ParkPing"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-lg text-foreground">
                ParkPing
              </span>
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              You must be logged in to claim admin access.
            </p>
            <Button
              className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="claim_admin.primary_button"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login with Internet Identity"
              )}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    try {
      await claimAdmin.mutateAsync(token.trim());
      toast.success("Admin access claimed successfully!");
      navigate({ to: "/admin" });
    } catch {
      toast.error("Invalid token or not logged in");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/assets/uploads/image-019d1cbb-24e0-7038-9daf-a5abc2143997-1.png"
              alt="ParkPing"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-lg text-foreground">ParkPing</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-4"
        >
          {/* Token display card */}
          <Card className="shadow-card border-teal-DEFAULT/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-DEFAULT" />
                Your Admin Setup Token
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Copy this token and paste it below to claim admin access.
              </p>
            </CardHeader>
            <CardContent>
              {tokenLoading ? (
                <Skeleton
                  className="h-10 w-full"
                  data-ocid="claim_admin.loading_state"
                />
              ) : setupToken ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm break-all select-all">
                    {setupToken}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToken}
                    className="shrink-0"
                    data-ocid="claim_admin.secondary_button"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Log in first to view your token.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Claim form */}
          <Card className="shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 rounded-2xl bg-teal-DEFAULT/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-teal-DEFAULT" />
              </div>
              <CardTitle className="text-2xl">Claim Admin Access</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your admin token to gain administrator privileges.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="admin-token">Admin Token</Label>
                  <Input
                    id="admin-token"
                    type="password"
                    placeholder="Enter your admin token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    autoComplete="off"
                    data-ocid="claim_admin.input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-teal-DEFAULT hover:bg-teal-dark text-white"
                  disabled={claimAdmin.isPending || !token.trim()}
                  data-ocid="claim_admin.submit_button"
                >
                  {claimAdmin.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    "Claim Admin"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border py-6">
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
