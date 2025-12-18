export function trackEvent(event: string, data?: any) {
  try {
    const payload = {
      event,
      data,
      timestamp: Date.now()
    };

    console.log('[Analytics]', payload);

    const existing = JSON.parse(
      localStorage.getItem('codesensei_events') || '[]'
    );

    existing.push(payload);
    localStorage.setItem('codesensei_events', JSON.stringify(existing));
  } catch (e) {
    // Swallow errors to ensure analytics never break the app
    try { console.warn('[Analytics Error]', e); } catch (_) { /* ignore */ }
  }
}
