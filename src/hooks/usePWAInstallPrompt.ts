import { useState, useEffect, useCallback } from 'react';
import { isAppInstalled } from '../utils/nativePwaPrompt';

export function usePWAInstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const installed = isAppInstalled();
    setIsStandalone(installed);
    setIsInstalled(installed);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isOpen: false,
    isIOS: false,
    isStandalone,
    isInstalled,
    canInstall: !isInstalled,
    handleInstallClick: useCallback(() => {}, []),
    handleDismiss: useCallback(() => {}, []),
    openManualPrompt: useCallback(() => {}, []),
  };
}

