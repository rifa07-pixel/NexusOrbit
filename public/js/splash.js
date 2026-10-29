/**
 * NexusOrbit - Signature Opening Experience
 * Stage A: Minimal Branded Splash Screen
 * Stage B: Smooth Transition to Login Screen
 * Stage C: Demo-Ready Authentication
 */
const SplashController = {
  SPLASH_KEY: 'nexusorbit_splash_seen_session',

  init() {
    const splashEl = document.getElementById('splash-screen');
    const loginEl = document.getElementById('login-screen');
    if (!splashEl) return;

    // Check if user already saw the splash screen in this session
    const hasSeenSplash = sessionStorage.getItem(this.SPLASH_KEY);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hasSeenSplash || prefersReducedMotion) {
      // Skip directly to login or main shell
      splashEl.classList.add('hidden');
      return;
    }

    // Sequence: 1.5 seconds controlled branded transition
    const timer = setTimeout(() => {
      this.dismissSplash();
    }, 1500);

    // Allow user to click to dismiss early
    splashEl.addEventListener('click', () => {
      clearTimeout(timer);
      this.dismissSplash();
    });

    // Also support keyboard dismissal (Escape / Enter / Space)
    window.addEventListener('keydown', (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key) && !splashEl.classList.contains('hidden')) {
        clearTimeout(timer);
        this.dismissSplash();
      }
    }, { once: true });
  },

  dismissSplash() {
    const splashEl = document.getElementById('splash-screen');
    if (!splashEl || splashEl.classList.contains('hidden')) return;

    splashEl.classList.add('hidden');
    sessionStorage.setItem(this.SPLASH_KEY, 'true');

    // Accessibility focus management: focus on login email input after splash dismissal
    setTimeout(() => {
      const emailInput = document.getElementById('login-email');
      if (emailInput && !window.App?.currentUser) {
        emailInput.focus();
      }
    }, 400);
  }
};

window.SplashController = SplashController;
