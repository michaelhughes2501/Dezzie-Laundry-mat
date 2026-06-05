import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { LaundromatState, Machine, Booking, LoyaltyProfile, Transaction, MaintenanceTask, SystemNotification } from './types';

// Initialize core Firebase App services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Expose Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  } catch (error) {
    console.error("Google Authenticator login routine rejected: ", error);
    throw error;
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// --- Firestore Exception Decoupler ---
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore operation encountered access clearance exception: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Dynamic Firestore State Push/Pull Sync ---
export async function pushStateToFirestore(state: LaundromatState): Promise<void> {
  const batch = writeBatch(db);

  try {
    // 1. Sync Pricing
    if (state.pricingRules) {
      const pricingRef = doc(db, 'pricingRules', 'current');
      batch.set(pricingRef, state.pricingRules);
    }

    // 2. Sync Machines
    state.machines.forEach(m => {
      // Clean undefined dynamic pricing keys for Firestore standard maps
      const cleanMachine = { ...m };
      if (cleanMachine.dynamicPrice === undefined) delete cleanMachine.dynamicPrice;
      if (cleanMachine.priceReasons === undefined) delete cleanMachine.priceReasons;
      if (cleanMachine.priceMultiplier === undefined) delete cleanMachine.priceMultiplier;

      const ref = doc(db, 'machines', m.id);
      batch.set(ref, cleanMachine);
    });

    // 3. Sync Bookings
    state.bookings.forEach(b => {
      const ref = doc(db, 'bookings', b.id);
      batch.set(ref, b);
    });

    // 4. Sync Loyalty Profiles
    state.loyaltyProfiles.forEach(lp => {
      const cleanProfile = { ...lp };
      if (cleanProfile.segment === undefined) delete cleanProfile.segment;
      if (cleanProfile.avgSpend === undefined) delete cleanProfile.avgSpend;
      if (cleanProfile.personalizedOffer === undefined) delete cleanProfile.personalizedOffer;

      const ref = doc(db, 'loyaltyProfiles', lp.id);
      batch.set(ref, cleanProfile);
    });

    // 5. Sync Transactions
    state.transactions.forEach(t => {
      const ref = doc(db, 'transactions', t.id);
      batch.set(ref, t);
    });

    // 6. Sync Maintenance Tasks
    state.maintenanceTasks.forEach(task => {
      const ref = doc(db, 'maintenanceTasks', task.id);
      batch.set(ref, task);
    });

    // 7. Sync Notifications
    state.notifications.forEach(n => {
      const ref = doc(db, 'notifications', n.id);
      batch.set(ref, n);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch-sync-push');
  }
}

export async function pullStateFromFirestore(): Promise<Partial<LaundromatState> | null> {
  try {
    const [
      machinesSnap,
      bookingsSnap,
      loyaltySnap,
      txSnap,
      maintenanceSnap,
      notificationsSnap
    ] = await Promise.all([
      getDocs(collection(db, 'machines')),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'loyaltyProfiles')),
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'maintenanceTasks')),
      getDocs(collection(db, 'notifications'))
    ]);

    if (machinesSnap.empty) {
      return null;
    }

    const machines = machinesSnap.docs.map(doc => doc.data() as Machine);
    const bookings = bookingsSnap.docs.map(doc => doc.data() as Booking);
    const loyaltyProfiles = loyaltySnap.docs.map(doc => doc.data() as LoyaltyProfile);
    const transactions = txSnap.docs.map(doc => doc.data() as Transaction);
    const maintenanceTasks = maintenanceSnap.docs.map(doc => doc.data() as MaintenanceTask);
    const notifications = notificationsSnap.docs.map(doc => doc.data() as SystemNotification);

    const pricingDoc = await getDocs(collection(db, 'pricingRules'));
    const pricingRules = !pricingDoc.empty ? (pricingDoc.docs[0].data() as any) : undefined;

    return {
      machines,
      bookings,
      loyaltyProfiles,
      transactions,
      maintenanceTasks,
      notifications,
      pricingRules
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'batch-pull');
  }
}

// --- Critical Connection Validation ---
async function testConnection() {
  try {
    // Tests connection stream
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase connectivity parameters or local offline caching.");
    }
  }
}
testConnection();
