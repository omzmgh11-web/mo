import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CardData } from './data';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Health Test as specified by guidelines
export async function testConnection(): Promise<boolean> {
  const path = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    // Expected to catch not-found or permission check without crashing
    return false;
  }
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Persist / update profile doc
  const userPath = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        ownerId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export interface CloudFullData {
  lessonsMap: Record<number, CardData[]>;
  lessonTitles: Record<number, string>;
  spacedSystem: '3' | '4' | '5';
  selectedDay: number;
  completedDays: Record<number, boolean>;
  completedDayLessons: Record<string, boolean>;
  completedDaysDates: Record<number, string>;
  dailyLearnedWords: Record<string, string[]>;
  favorites: Record<string, boolean>;
  weakWords: Record<string, number>;
  hints: Record<string, string>;
  autoSpeak5Sec: boolean;
  lastSyncedAt?: string;
}

// Save all lessons and study progress to Firestore
export async function syncUserDataToFirestore(userId: string, data: CloudFullData): Promise<void> {
  if (!userId) return;

  const progressPath = `users/${userId}/progress/main`;
  try {
    // 1. Save Study Progress doc
    await setDoc(
      doc(db, 'users', userId, 'progress', 'main'),
      {
        ownerId: userId,
        spacedSystem: data.spacedSystem,
        selectedDay: data.selectedDay,
        completedDays: data.completedDays || {},
        completedDayLessons: data.completedDayLessons || {},
        completedDaysDates: data.completedDaysDates || {},
        lessonTitles: data.lessonTitles || {},
        autoSpeak5Sec: Boolean(data.autoSpeak5Sec),
        dailyLearnedWords: data.dailyLearnedWords || {},
        favorites: data.favorites || {},
        weakWords: data.weakWords || {},
        hints: data.hints || {},
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, progressPath);
  }

  // 2. Save each lesson deck to subcollection /users/{userId}/decks/{lessonId}
  const lessonEntries = Object.entries(data.lessonsMap);
  for (const [lessonKey, words] of lessonEntries) {
    const lessonNum = Number(lessonKey);
    if (isNaN(lessonNum) || lessonNum < 0 || lessonNum > 30) continue;
    const deckDocId = `lesson_${lessonNum}`;
    const deckPath = `users/${userId}/decks/${deckDocId}`;
    try {
      await setDoc(
        doc(db, 'users', userId, 'decks', deckDocId),
        {
          ownerId: userId,
          lessonId: deckDocId,
          lessonNumber: lessonNum,
          title: data.lessonTitles?.[lessonNum] || '',
          words: Array.isArray(words) ? words.slice(0, 300) : [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, deckPath);
    }
  }
}

// Load user data from Firestore on sign-in / manual sync pull
export async function loadUserDataFromFirestore(userId: string): Promise<CloudFullData | null> {
  if (!userId) return null;

  const progressPath = `users/${userId}/progress/main`;
  let progressSnap;
  try {
    progressSnap = await getDoc(doc(db, 'users', userId, 'progress', 'main'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, progressPath);
  }

  const decksPath = `users/${userId}/decks`;
  let decksSnap;
  try {
    decksSnap = await getDocs(collection(db, 'users', userId, 'decks'));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, decksPath);
  }

  if (!progressSnap.exists() && decksSnap.empty) {
    return null;
  }

  const progressData = progressSnap.exists() ? progressSnap.data() : {};
  const lessonsMap: Record<number, CardData[]> = {};
  const lessonTitles: Record<number, string> = { ...(progressData.lessonTitles || {}) };

  decksSnap.forEach((dDoc) => {
    const dData = dDoc.data();
    const lNum = typeof dData.lessonNumber === 'number' ? dData.lessonNumber : null;
    if (lNum !== null && Array.isArray(dData.words)) {
      lessonsMap[lNum] = dData.words;
      if (dData.title && !lessonTitles[lNum]) {
        lessonTitles[lNum] = dData.title;
      }
    }
  });

  return {
    lessonsMap,
    lessonTitles,
    spacedSystem: progressData.spacedSystem || '5',
    selectedDay: typeof progressData.selectedDay === 'number' ? progressData.selectedDay : 0,
    completedDays: progressData.completedDays || {},
    completedDayLessons: progressData.completedDayLessons || {},
    completedDaysDates: progressData.completedDaysDates || {},
    dailyLearnedWords: progressData.dailyLearnedWords || {},
    favorites: progressData.favorites || {},
    weakWords: progressData.weakWords || {},
    hints: progressData.hints || {},
    autoSpeak5Sec: typeof progressData.autoSpeak5Sec === 'boolean' ? progressData.autoSpeak5Sec : true,
    lastSyncedAt: progressData.updatedAt || undefined,
  };
}
