import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCallerProfile } from "../hooks/useQueries";

export default function PrintStickerPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText() ?? null;
  const { data: profile } = useCallerProfile();

  const displayName = profile?.displayName || "Car Owner";
  const qrUrl = principal
    ? `${window.location.origin}/send?to=${principal}`
    : "";
  const qrApiUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&color=0f766e`
    : "";

  if (!identity) {
    navigate({ to: "/" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Screen-only controls */}
      <div className="print:hidden">
        <header className="bg-white border-b border-border">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="print_sticker.link"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <Button
              className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
              onClick={() => window.print()}
              data-ocid="print_sticker.primary_button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Sticker
            </Button>
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Temporary Sticker</strong> — This is a temporary printable
            version. For a professional weatherproof sticker, order a physical
            one from your dashboard.
          </div>
        </div>
      </div>

      {/* Printable sticker area */}
      <div className="flex items-center justify-center px-4 py-8 print:py-0 print:block">
        <div
          className="sticker-container bg-white border-4 border-teal-DEFAULT rounded-3xl p-8 w-[340px] text-center shadow-xl print:shadow-none print:border-2 print:rounded-2xl print:w-full print:max-w-[320px] print:mx-auto"
          data-ocid="print_sticker.card"
        >
          {/* Header branding */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <img
              src="/assets/uploads/image-019d1cbb-24e0-7038-9daf-a5abc2143997-1.png"
              alt="ParkPing"
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-xl text-teal-DEFAULT tracking-tight">
              ParkPing
            </span>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            {qrApiUrl ? (
              <div className="p-3 bg-white rounded-2xl border-2 border-teal-DEFAULT/20">
                <img
                  src={qrApiUrl}
                  alt="ParkPing QR Code"
                  className="w-52 h-52"
                />
              </div>
            ) : (
              <div className="w-52 h-52 bg-muted rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Loading…</span>
              </div>
            )}
          </div>

          {/* Display name */}
          <p className="text-lg font-bold text-foreground mb-1">
            {displayName}
          </p>

          {/* CTA text */}
          <p className="text-sm text-muted-foreground leading-snug mb-4">
            Scan QR code to contact owner
          </p>

          {/* Divider */}
          <div className="border-t border-dashed border-teal-DEFAULT/30 pt-3">
            <p className="text-xs text-teal-DEFAULT font-medium">
              parkping.app
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
