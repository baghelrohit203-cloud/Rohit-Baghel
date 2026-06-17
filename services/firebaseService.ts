import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { ActivityEntry, Note, Goal, VaultEntry, PriceArticle } from '../types';

// Hardcoded verified configuration from firebase-applet-config.json for absolute compile-time reliability
const firebaseConfig = {
  projectId: "brilliant-theme-007pf",
  appId: "1:1013745083947:web:88c22c89dfa360dcf62c6e",
  apiKey: "AIzaSyC-d5TWpYXzJYcjLJiY5VDU4J7w5YEHVEw",
  authDomain: "brilliant-theme-007pf.firebaseapp.com",
  firestoreDatabaseId: "default",
  storageBucket: "brilliant-theme-007pf.firebasestorage.app",
  messagingSenderId: "1013745083947"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Data Interfaces for Sync
export interface SyncCallbacks {
  onActivitiesUpdate: (activities: ActivityEntry[]) => void;
  onNotesUpdate: (notes: Note[]) => void;
  onGoalsUpdate: (goals: Goal[]) => void;
  onReflectionUpdate: (content: string) => void;
  onVaultUpdate: (entries: VaultEntry[]) => void;
  onWatchlistUpdate: (articles: PriceArticle[]) => void;
  onSyncStateChange: (syncing: boolean, text: string) => void;
}

/**
 * Handles saving local data snapshot to cloud on initial login/signup (Data Upload/Merge)
 */
export const uploadLocalDataToCloud = async (
  userId: string,
  data: {
    activities: ActivityEntry[];
    notes: Note[];
    goals: Goal[];
    reflection: string;
    vaultEntries: VaultEntry[];
    priceArticles: PriceArticle[];
  },
  onStatus: (text: string) => void
) => {
  try {
    onStatus('Uploading local items to secure Cloud database...');
    const batch = writeBatch(db);

    // 1. Upload Activities
    data.activities.forEach(item => {
      const ref = doc(db, 'activities', item.id);
      batch.set(ref, { ...item, userId });
    });

    // 2. Upload Notes
    data.notes.forEach(item => {
      const ref = doc(db, 'notes', item.id);
      batch.set(ref, { ...item, userId });
    });

    // 3. Upload Goals
    data.goals.forEach(item => {
      const ref = doc(db, 'goals', item.id);
      batch.set(ref, { ...item, userId });
    });

    // 4. Upload Reflection
    if (data.reflection.trim()) {
      const ref = doc(db, 'reflections', userId);
      batch.set(ref, { userId, content: data.reflection, updatedAt: Date.now() });
    }

    // 5. Upload Vault Entries
    data.vaultEntries.forEach(item => {
      const ref = doc(db, 'vaultEntries', item.id);
      batch.set(ref, { ...item, userId });
    });

    // 6. Upload Price Articles
    data.priceArticles.forEach(item => {
      const ref = doc(db, 'priceArticles', item.id);
      batch.set(ref, { ...item, userId });
    });

    await batch.commit();
    onStatus('Cloud synchronization completed successfully!');
  } catch (error: any) {
    console.error('Data Migration Upload Error:', error);
    onStatus('Some local values could not be merged: ' + error.message);
  }
};

/**
 * Real-time active listener subscriptions for Firestore collections
 */
export const subscribeToCloudCollections = (
  userId: string,
  callbacks: SyncCallbacks
): (() => void)[] => {
  const unsubscribers: (() => void)[] = [];

  callbacks.onSyncStateChange(true, 'Connecting to Firestore cloud...');

  // 1. Subscribe to Activities
  try {
    const qActivities = query(collection(db, 'activities'), where('userId', '==', userId));
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      const list: ActivityEntry[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const { userId: _, ...item } = d;
        list.push(item as ActivityEntry);
      });
      callbacks.onActivitiesUpdate(list);
      callbacks.onSyncStateChange(false, 'Synced');
    }, (err) => {
      console.error('Activities feed error:', err);
      callbacks.onSyncStateChange(false, 'Feed error: ' + err.message);
    });
    unsubscribers.push(unsubActivities);
  } catch (e) {
    console.error('Activities sub catch:', e);
  }

  // 2. Subscribe to Notes
  try {
    const qNotes = query(collection(db, 'notes'), where('userId', '==', userId));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const list: Note[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const { userId: _, ...item } = d;
        list.push(item as Note);
      });
      callbacks.onNotesUpdate(list);
    });
    unsubscribers.push(unsubNotes);
  } catch (e) {
    console.error('Notes sub catch:', e);
  }

  // 3. Subscribe to Goals
  try {
    const qGoals = query(collection(db, 'goals'), where('userId', '==', userId));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const list: Goal[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const { userId: _, ...item } = d;
        list.push(item as Goal);
      });
      callbacks.onGoalsUpdate(list);
    });
    unsubscribers.push(unsubGoals);
  } catch (e) {
    console.error('Goals sub catch:', e);
  }

  // 4. Subscribe to Reflection
  try {
    const unsubRefl = onSnapshot(doc(db, 'reflections', userId), (snapshot) => {
      if (snapshot.exists()) {
        callbacks.onReflectionUpdate(snapshot.data().content || '');
      } else {
        callbacks.onReflectionUpdate('');
      }
    });
    unsubscribers.push(unsubRefl);
  } catch (e) {
    console.error('Reflection sub catch:', e);
  }

  // 5. Subscribe to Information Vault
  try {
    const qVault = query(collection(db, 'vaultEntries'), where('userId', '==', userId));
    const unsubVault = onSnapshot(qVault, (snapshot) => {
      const list: VaultEntry[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const { userId: _, ...item } = d;
        list.push(item as VaultEntry);
      });
      callbacks.onVaultUpdate(list);
    });
    unsubscribers.push(unsubVault);
  } catch (e) {
    console.error('Vault sub catch:', e);
  }

  // 6. Subscribe to Price Articles
  try {
    const qPrice = query(collection(db, 'priceArticles'), where('userId', '==', userId));
    const unsubPrice = onSnapshot(qPrice, (snapshot) => {
      const list: PriceArticle[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const { userId: _, ...item } = d;
        list.push(item as PriceArticle);
      });
      callbacks.onWatchlistUpdate(list);
    });
    unsubscribers.push(unsubPrice);
  } catch (e) {
    console.error('Price sub catch:', e);
  }

  return unsubscribers;
};

// WRITE LOGIC TO CLOUD
export const cloudSaveActivity = async (userId: string, activity: ActivityEntry) => {
  await setDoc(doc(db, 'activities', activity.id), { ...activity, userId });
};

export const cloudDeleteActivity = async (activityId: string) => {
  await deleteDoc(doc(db, 'activities', activityId));
};

export const cloudSaveNote = async (userId: string, note: Note) => {
  await setDoc(doc(db, 'notes', note.id), { ...note, userId });
};

export const cloudDeleteNote = async (noteId: string) => {
  await deleteDoc(doc(db, 'notes', noteId));
};

export const cloudSaveGoal = async (userId: string, goal: Goal) => {
  await setDoc(doc(db, 'goals', goal.id), { ...goal, userId });
};

export const cloudDeleteGoal = async (goalId: string) => {
  await deleteDoc(doc(db, 'goals', goalId));
};

export const cloudSaveReflection = async (userId: string, content: string) => {
  await setDoc(doc(db, 'reflections', userId), { userId, content, updatedAt: Date.now() });
};

export const cloudSaveVaultEntry = async (userId: string, entry: VaultEntry) => {
  await setDoc(doc(db, 'vaultEntries', entry.id), { ...entry, userId });
};

export const cloudDeleteVaultEntry = async (entryId: string) => {
  await deleteDoc(doc(db, 'vaultEntries', entryId));
};

export const cloudSavePriceArticle = async (userId: string, article: PriceArticle) => {
  await setDoc(doc(db, 'priceArticles', article.id), { ...article, userId });
};

export const cloudDeletePriceArticle = async (articleId: string) => {
  await deleteDoc(doc(db, 'priceArticles', articleId));
};
