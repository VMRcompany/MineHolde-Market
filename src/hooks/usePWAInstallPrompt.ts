import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'mineholde_pwa_dismissed_at';
const DISMISS_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days cooldown

export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if already running in standalone (installed) mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // 2. Check for iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // 3. Check dismissal timestamp
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    const hasActiveCooldown = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_COOLDOWN_MS;

    // 4. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser mini-infobar
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Only open if not dismissed recently
      if (!hasActiveCooldown) {
        setIsOpen(true);
      }
    };

    // 5. Listen for successful installation
    const handleAppInstalled = () => {
      setIsOpen(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
      localStorage.removeItem(DISMISS_KEY);
      console.log('[PWA] MineHolde Market installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS Safari: if user is on iOS and not standalone and not dismissed, show after 3 seconds
    let iosTimer: NodeJS.Timeout | null = null;
    if (isIosDevice && !hasActiveCooldown && !isStandaloneMode) {
      iosTimer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
    }

    // Custom debug / test trigger event: window.dispatchEvent(new CustomEvent('test-pwa-prompt'))
    const handleTestTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('test-pwa-prompt', handleTestTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('test-pwa-prompt', handleTestTrigger);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  // Handle click on Install button
  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted installation prompt');
          setIsOpen(false);
          setDeferredPrompt(null);
          setIsInstalled(true);
        } else {
          console.log('[PWA] User dismissed installation prompt');
          handleDismiss();
        }
      } catch (err) {
        console.warn('[PWA] Prompt execution error:', err);
        handleDismiss();
      }
    } else if (isIOS) {
      // iOS cannot trigger prompt programmatically, banner already provides instructions
    } else {
      // Fallback if browser doesn't support native prompt or already dismissed
      handleDismiss();
    }
  }, [deferredPrompt, isIOS]);

  // Handle dismissal
  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  // Force open (useful for footer / settings "Install App" button)
  const openManualPrompt = useCallback(() => {
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    isIOS,
    isStandalone,
    isInstalled,
    canInstall: !!deferredPrompt || isIOS,
    handleInstallClick,
    handleDismiss,
    openManualPrompt,
  };
}
