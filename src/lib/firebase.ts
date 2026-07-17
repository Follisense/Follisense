// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            'AIzaSyCAtBfWDHUuExJDDTOeKBtevdzSn3MgZ0Q',
  authDomain:        'follisense-c46b1.firebaseapp.com',
  projectId:         'follisense-c46b1',
  storageBucket:     'follisense-c46b1.firebasestorage.app',
  messagingSenderId: '573910311260',
  appId:             '1:573910311260:web:3b89ad03ba24930128a199',
};

const VAPID_KEY = 'BNJmFBH32mYckxC9B45bYo7XX9UNik0CURHKjpDi5DdFl7R75pqDv4tBUc1x9AoddFeWh8E7ws0DpOCmULX8hh4';

const app       = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Permission denied');
      return null;
    }
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('[FCM] Token:', token);
    return token;
  } catch (err) {
    console.error('[FCM] Error getting token:', err);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  return onMessage(messaging, callback);
};

export { messaging };