import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  ScanLine,
  Shield,
  SwitchCamera,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect } from "react";
import { useQRScanner } from "../qr-code/useQRScanner";

export default function ScanPage() {
  const navigate = useNavigate();
  const {
    qrResults,
    isActive,
    isSupported,
    error,
    isLoading,
    canStartScanning,
    startScanning,
    stopScanning,
    switchCamera,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: "environment",
    scanInterval: 100,
    maxResults: 3,
  });

  const handleQrResult = useCallback(
    (data: string) => {
      stopScanning();
      try {
        const url = new URL(data);
        if (url.origin === window.location.origin) {
          navigate({ to: (url.pathname + url.search) as any });
        } else {
          const to = url.searchParams.get("to");
          if (to) {
            navigate({ to: `/send?to=${to}` as any });
          } else {
            window.location.href = data;
          }
        }
      } catch {
        navigate({ to: `/send?to=${data}` as any });
      }
    },
    [stopScanning, navigate],
  );

  useEffect(() => {
    if (qrResults.length > 0) {
      handleQrResult(qrResults[0].data);
    }
  }, [qrResults, handleQrResult]);

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  return (
    <div className="min-h-screen bg-navy-DEFAULT text-white">
      <header className="border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              stopScanning();
              navigate({ to: "/" });
            }}
            className="text-white/70 hover:text-white"
            data-ocid="nav.link"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/image-019d1bf4-5028-7557-a9f9-befc1d4e24fa-1.png"
              alt="ParkPing"
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-teal-600 tracking-tight">
              ParkPing
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-full bg-teal-DEFAULT/20 flex items-center justify-center mx-auto mb-3">
            <ScanLine className="w-7 h-7 text-teal-DEFAULT" />
          </div>
          <h1 className="text-2xl font-bold">Scan QR Code</h1>
          <p className="text-white/60 text-sm mt-1">
            Point your camera at a ParkPing QR code
          </p>
        </motion.div>

        {isSupported === false ? (
          <div className="text-center py-12" data-ocid="scan.error_state">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="font-semibold">Camera not supported</p>
            <p className="text-white/60 text-sm mt-1">
              Your browser doesn't support camera access.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-DEFAULT rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-DEFAULT rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-DEFAULT rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-DEFAULT rounded-br-lg" />
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-teal-DEFAULT"
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{
                        duration: 2.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>
              )}

              {isLoading && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/50"
                  data-ocid="scan.loading_state"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-teal-DEFAULT" />
                </div>
              )}

              {!isActive && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <ScanLine className="w-12 h-12 text-white/30 mb-3" />
                  <p className="text-white/50 text-sm">Camera inactive</p>
                </div>
              )}
            </div>

            {error && (
              <div
                className="bg-destructive/20 border border-destructive/40 rounded-xl px-4 py-3 text-sm"
                data-ocid="scan.error_state"
              >
                <p className="font-medium text-red-300">Camera error</p>
                <p className="text-white/70 mt-0.5">{error.message}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {!isActive ? (
                <Button
                  className="bg-teal-DEFAULT hover:bg-teal-dark text-white px-8"
                  onClick={startScanning}
                  disabled={!canStartScanning}
                  data-ocid="scan.primary_button"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ScanLine className="w-4 h-4 mr-2" />
                  )}
                  Start Scanning
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={stopScanning}
                  disabled={isLoading}
                  data-ocid="scan.secondary_button"
                >
                  Stop
                </Button>
              )}
              {isMobile && isActive && (
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={switchCamera}
                  disabled={isLoading}
                  data-ocid="scan.toggle"
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <p className="text-center text-white/40 text-xs">
              The camera is used only for scanning QR codes and nothing is
              recorded.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
