/**
 * Native Browser PWA Installation Prompt Controller
 *
 * Directly triggers the native browser installation dialog (e.g. Google Chrome WebAPK prompt)
 * on every visit unless the user has installed the app.
 * If the user did not install it, it prompts again on every visit.
 * No custom or fake in-app UI is shown — strictly the native browser dialog.
 */

const PWA_INSTALLED_KEY = 'mineholde_pwa_installed';

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Display mode standalone (installed PWA / WebAPK)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  if (isStandalone) {
    localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    return true;
  }

  // 2. Previously marked as installed after accepting installation
  if (localStorage.getItem(PWA_INSTALLED_KEY) === 'true') {
    return true;
  }

  return false;
}

export function initNativePwaPrompt(): void {
  if (typeof window === 'undefined') return;

  // If already installed, never show prompt
  if (isAppInstalled()) {
    return;
  }

  // Clear any old fake cooldowns from previous implementations
  localStorage.removeItem('mineholde_pwa_dismissed_at');

  let deferredPrompt: any = null;
  let hasTriggeredThisSession = false;

  const invokeBrowserPrompt = async () => {
    if (!deferredPrompt || hasTriggeredThisSession || isAppInstalled()) {
      return;
    }

    try {
      hasTriggeredThisSession = true;
      console.log('[PWA] Invoking native browser install prompt');
      await deferredPrompt.prompt();

      const choiceResult = await deferredPrompt.userChoice;
      console.log('[PWA] User installation choice:', choiceResult?.outcome);

      if (choiceResult?.outcome === 'accepted') {
        // User installed the app! Save to localStorage so it never prompts again
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        deferredPrompt = null;
      } else {
        // User dismissed or didn't install:
        // Do NOT store in localStorage, so that next visit to the site it prompts again!
        deferredPrompt = null;
      }
    } catch (err) {
      console.warn('[PWA] Native prompt trigger error (user gesture may be required):', err);
      // Allow retry on user gesture
      hasTriggeredThisSession = false;
    }
  };

  // 1. Listen for browser beforeinstallprompt event (Google Chrome, Edge, Chromium)
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    if (isAppInstalled()) return;

    // Prevent default browser ambient display so we can call .prompt() explicitly
    e.preventDefault();
    deferredPrompt = e;

    // Immediately attempt to invoke the native browser install dialog
    invokeBrowserPrompt();
  });

  // 2. Many browser engines (such as Chromium on Android) require a user gesture (tap/click)
  // to invoke .prompt(). We listen for the first user interaction on the page to invoke it immediately.
  const handleUserInteraction = () => {
    if (deferredPrompt && !hasTriggeredThisSession && !isAppInstalled()) {
      invokeBrowserPrompt();
    }
  };

  window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
  window.addEventListener('touchstart', handleUserInteraction, { passive: true });
  window.addEventListener('click', handleUserInteraction, { passive: true });

  // 3. Listen for appinstalled event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] MineHolde Market installed successfully');
    localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    deferredPrompt = null;
    hasTriggeredThisSession = true;
  });
}
