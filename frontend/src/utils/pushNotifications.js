import api from '../services/api';

/**
 * Convert base64 url-safe string to Uint8Array for PushManager subscription
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports Service Workers & Push Notifications
 */
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current push notification state
 */
export async function getPushNotificationStatus() {
  if (!isPushNotificationSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      return { supported: true, permission, isSubscribed: false };
    }
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: !!subscription,
    };
  } catch (err) {
    console.warn('[Push] Error getting status:', err);
    return { supported: true, permission, isSubscribed: false };
  }
}

/**
 * Register service worker and subscribe browser to Web Push
 */
export async function subscribeToPushNotifications() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // 1. Request permission if not already granted
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied. Please allow notifications in your browser site settings.'
        : 'Notification permission was dismissed.'
    );
  }

  // 2. Register Service Worker
  let registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Wait until service worker is active
  if (registration.installing || registration.waiting) {
    await new Promise((resolve) => {
      const sw = registration.installing || registration.waiting;
      if (sw.state === 'activated') {
        resolve();
      } else {
        sw.addEventListener('statechange', function onStateChange() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', onStateChange);
            resolve();
          }
        });
      }
    });
  }

  // 3. Get public VAPID key from backend
  const keyRes = await api.get('/push/vapid-public-key');
  const vapidPublicKey = keyRes.data?.public_key;
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is missing on the server.');
  }

  // 4. Subscribe with PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  // 5. Send subscription details to backend
  const subJson = subscription.toJSON();
  await api.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
    },
    contentEncoding: (PushManager.supportedContentEncodings || ['aesgcm'])[0] || 'aesgcm',
  });

  return { success: true, subscription };
}

/**
 * Unsubscribe current browser from Web Push
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Notify backend
      try {
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      } catch (e) {
        console.warn('[Push] Error unsubscribing on backend:', e);
      }
      // Unsubscribe locally
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('[Push] Error unsubscribing:', err);
    throw err;
  }
}

/**
 * Send a test push notification to verify setup
 */
export async function sendTestPushNotification() {
  return await api.post('/push/test');
}
