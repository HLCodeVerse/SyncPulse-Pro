/* Web Push (VAPID) & Background Call Delivery Service */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function showBackgroundCallNotification(callerName: string, isVideo: boolean) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const title = `📞 Incoming ${isVideo ? 'Video' : 'Voice'} Call from ${callerName}`;
    const options = {
      body: 'SyncPulse Pro — Tap to answer incoming call',
      icon: '/icon.png',
      tag: 'incoming-call',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    };
    
    new Notification(title, options);
  }
}
