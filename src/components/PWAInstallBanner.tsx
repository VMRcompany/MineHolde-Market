import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';

interface PWAInstallBannerProps {
  appName?: string;
  appDescription?: string;
  iconSrc?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = () => {
  // Pure native browser installation prompt is used via initNativePwaPrompt().
  // Custom in-app UI banners are intentionally disabled as requested.
  return null;
};
