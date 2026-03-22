import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  QrCode,
  ScanLine,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const steps = [
  {
    number: "01",
    title: "Register",
    description:
      "Create your free ParkPing account and get your unique parking identity in seconds.",
    icon: <Users className="w-8 h-8 text-teal-DEFAULT" />,
  },
  {
    number: "02",
    title: "Stick",
    description:
      "Print or save your personalized QR code and place it visibly on your car dashboard or windshield.",
    icon: <QrCode className="w-8 h-8 text-teal-DEFAULT" />,
  },
  {
    number: "03",
    title: "Connect",
    description:
      "Anyone who needs to reach you just scans your code and sends a message — no app download needed.",
    icon: <Bell className="w-8 h-8 text-teal-DEFAULT" />,
  },
];

const features = [
  {
    img: "/assets/generated/feature-qr-car.dim_400x300.png",
    title: "Your Car's Digital ID",
    description:
      "A unique QR code links directly to your inbox. Stick it on your car and stay reachable.",
  },
  {
    img: "/assets/generated/feature-scan-person.dim_400x300.png",
    title: "Instant Scanning",
    description:
      "No app download required. Anyone with a phone camera can scan and send you a message.",
  },
  {
    img: "/assets/generated/feature-notification.dim_400x300.png",
    title: "Real-Time Alerts",
    description:
      "Receive anonymous messages about your car straight to your secure inbox.",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Daily commuter",
    quote:
      "Someone told me my headlights were on! Saved my battery and my day. ParkPing is genius.",
    stars: 5,
  },
  {
    name: "James T.",
    role: "Parking lot manager",
    quote:
      "We use ParkPing in our lot now. So many fewer angry notes on windshields. Everyone loves it.",
    stars: 5,
  },
  {
    name: "Priya K.",
    role: "Urban driver",
    quote:
      "Finally a way for people to reach me without leaving physical notes. Clean, private, effective.",
    stars: 5,
  },
];

const STAR_KEYS = ["star-1", "star-2", "star-3", "star-4", "star-5"];

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, loginStatus, identity } = useInternetIdentity();
  const [email, setEmail] = useState("");
  const isLoggedIn = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const handleGetStarted = async () => {
    if (isLoggedIn) {
      navigate({ to: "/dashboard" });
    } else {
      await login();
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/assets/uploads/image-2-1.png"
              alt="ParkPing"
              className="h-9 w-auto"
            />
            <span className="text-xl font-bold text-teal-600 tracking-tight">
              ParkPing
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              data-ocid="nav.link"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              data-ocid="nav.link"
            >
              Features
            </a>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={handleGetStarted}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                data-ocid="nav.link"
              >
                Login
              </button>
            )}
          </nav>
          <Button
            onClick={handleGetStarted}
            disabled={isLoggingIn}
            className="bg-teal-DEFAULT hover:bg-teal-dark text-white"
            data-ocid="nav.primary_button"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient text-white py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex justify-center order-2 lg:order-1"
            >
              <img
                src="/assets/generated/phone-mockup-transparent.dim_400x700.png"
                alt="ParkPing app on phone"
                className="w-64 sm:w-80 drop-shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="order-1 lg:order-2"
            >
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
                Your car,{" "}
                <span className="text-teal-DEFAULT">always reachable.</span>
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                ParkPing lets anyone leave you a message about your parked car —
                no phone numbers, no apps, just a simple QR code on your
                dashboard.
              </p>

              <div className="hero-card rounded-2xl p-6">
                <h3 className="font-semibold text-lg mb-1">
                  Get your free QR code
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  Create your account in seconds, no credit card needed.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                    data-ocid="hero.input"
                  />
                  <Button
                    onClick={handleGetStarted}
                    disabled={isLoggingIn}
                    className="bg-teal-DEFAULT hover:bg-teal-dark text-white font-semibold whitespace-nowrap"
                    data-ocid="hero.primary_button"
                  >
                    {isLoggingIn
                      ? "Connecting..."
                      : isLoggedIn
                        ? "Go to Dashboard"
                        : "Generate My QR Code"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <p className="text-white/50 text-xs mt-3">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="text-teal-DEFAULT hover:underline"
                    data-ocid="hero.link"
                  >
                    {isLoggedIn ? "Go to Dashboard" : "Login"}
                  </button>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: "/scan" })}
                className="mt-4 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
                data-ocid="hero.secondary_button"
              >
                <ScanLine className="w-4 h-4" />
                Scan a QR code
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three simple steps to stay connected to your car.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative bg-card rounded-2xl p-8 shadow-card overflow-hidden"
              >
                <span className="step-number">{step.number}</span>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-teal-light flex items-center justify-center mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Solve Daily Problems Together
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Whether it's lights left on, a parking issue, or a quick note —
              ParkPing bridges the gap.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              What Drivers Say
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card rounded-2xl p-8 shadow-card"
              >
                <div className="flex gap-0.5 mb-4">
                  {STAR_KEYS.slice(0, t.stars).map((key) => (
                    <Star
                      key={key}
                      className="w-5 h-5 fill-teal-DEFAULT text-teal-DEFAULT"
                    />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-4 italic">
                  "{t.quote}"
                </p>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-muted-foreground text-sm">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-DEFAULT flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <img
                src="/assets/uploads/image-2-1.png"
                alt="ParkPing"
                className="h-7 w-auto"
              />
              <span className="text-lg font-bold text-teal-600 tracking-tight">
                ParkPing
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a
                href="#how-it-works"
                className="hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
              <button
                type="button"
                onClick={() => navigate({ to: "/scan" })}
                className="hover:text-foreground transition-colors"
              >
                Scan QR
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()}. Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-DEFAULT hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
