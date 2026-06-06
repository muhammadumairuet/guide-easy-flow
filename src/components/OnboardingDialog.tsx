import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, MousePointerClick, BarChart3, Sparkles, ShieldCheck, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "1. Pick a stock",
    body: "Choose any company from the dropdown — Apple, Tesla, NVIDIA and more. Each one loads its own price history instantly.",
  },
  {
    icon: Sparkles,
    title: "2. Choose a model",
    body: "Logistic Regression learns from technical indicators. Momentum follows recent trend strength. Try both and compare.",
  },
  {
    icon: TrendingUp,
    title: "3. Run the analysis",
    body: "Hit Run Analysis. We train, backtest, and predict tomorrow's direction — all in your browser, in seconds.",
  },
  {
    icon: BarChart3,
    title: "4. Read the results",
    body: "A plain-English banner tells you UP or DOWN with a confidence score. Cards and charts show accuracy and returns.",
  },
  {
    icon: ShieldCheck,
    title: "Heads up",
    body: "This is an educational demo using sample data. It is not financial advice — never trade real money based on it.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;
  const Active = STEPS[step];
  const Icon = Active.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-2xl"
          initial={{ scale: 0.92, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundImage: "var(--gradient-glow)" }}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close guide"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quick start guide</p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-foreground">{Active.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{Active.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                className="gap-1"
              >
                {isLast ? "Get started" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
