"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

const slides = [
  {
    title: "The Problem",
    subtitle: "Your agent leaks everything about you",
    items: [
      { icon: "🔓", label: "Full Key Access", bad: "Agent holds your private key — can drain your entire wallet", color: "text-geass-red" },
      { icon: "👁", label: "Logged Reasoning", bad: "LLM providers store every prompt — your strategy is their data", color: "text-geass-red" },
      { icon: "🔗", label: "Linked Identity", bad: "Every service sees your wallet — spending patterns, contacts, behavior", color: "text-geass-red" },
    ],
  },
  {
    title: "The Solution",
    subtitle: "GEASS — The Power of Absolute Delegation",
    items: [
      { icon: "⚡", label: "Scoped Delegation", good: "Ephemeral key with 0.01 ETH max — if hacked, attacker gets pennies", color: "text-geass-green" },
      { icon: "🧠", label: "Private Reasoning", good: "Venice.ai runs inference without storing anything — invisible cognition", color: "text-geass-green" },
      { icon: "🔐", label: "Identity Separation", good: "Agent authenticates with its own key — your wallet is never revealed", color: "text-geass-green" },
    ],
  },
  {
    title: "Zero Residual Trust",
    subtitle: "Close the tab. The agent key dies.",
    items: [
      { icon: "🗝", label: "Ephemeral Keys", good: "Generated in your browser. Never sent to any server. Gone on tab close.", color: "text-geass-accent" },
      { icon: "📜", label: "On-Chain Enforcement", good: "Smart contract caveat enforcers — not app code, not a config file.", color: "text-geass-accent" },
      { icon: "🛡", label: "Non-Custodial", good: "Your wallet signs the delegation. You stay in control. Always.", color: "text-geass-accent" },
    ],
  },
];

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("geass-onboarding-seen");
    if (!seen) setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("geass-onboarding-seen", "1");
  }

  function next() {
    if (slide < slides.length - 1) setSlide(slide + 1);
    else dismiss();
  }

  if (!show) return null;

  const s = slides[slide];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && dismiss()}
      >
        <motion.div
          key={slide}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-geass-card border border-geass-border rounded-2xl p-8 max-w-lg w-full relative overflow-hidden"
        >
          {/* Background glow */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 ${
            slide === 0 ? "bg-geass-red/10" : slide === 1 ? "bg-geass-green/10" : "bg-geass-accent/10"
          }`} />

          {/* Logo on first slide */}
          {slide === 0 && (
            <div className="flex justify-center mb-6">
              <Image src="/logo.png" alt="GEASS" width={48} height={48} className="rounded" />
            </div>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === slide ? "bg-geass-accent" : "bg-geass-border"}`} />
            ))}
          </div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-white text-center font-display"
          >
            {s.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 text-center mt-1 mb-6"
          >
            {s.subtitle}
          </motion.p>

          {/* Items */}
          <div className="space-y-3">
            {s.items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3 p-3 bg-geass-bg/50 rounded-lg border border-geass-border/50"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {"bad" in item ? item.bad : item.good}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={dismiss} className="text-xs text-gray-600 hover:text-gray-400 transition">
              Skip
            </button>
            <button
              onClick={next}
              className="bg-geass-accent hover:bg-geass-accent-bright px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-geass-accent/20"
            >
              {slide < slides.length - 1 ? "Next" : "Start Building"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
