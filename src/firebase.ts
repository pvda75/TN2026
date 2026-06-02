import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, disableNetwork, setLogLevel } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, UploadMetadata } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

try {
  const quotaExceededUntil = localStorage.getItem("firestoreQuotaExceededUntil");
  if (quotaExceededUntil && parseInt(quotaExceededUntil) > Date.now()) {
    setLogLevel('silent');
    disableNetwork(db).catch(() => {});
  }
} catch (e) {}

export const auth = getAuth(app);
export const storage = getStorage(app);
try {
  storage.maxUploadRetryTime = 30000; // 30 seconds
  storage.maxOperationRetryTime = 30000; // 30 seconds
} catch (e) {
  console.error("Failed to set storage retry times:", e);
}
export const googleProvider = new GoogleAuthProvider();

export const uploadBase64ToStorage = async (path: string, base64: string, metadata?: UploadMetadata): Promise<string> => {
  if (!base64 || !base64.startsWith("data:")) {
    // Already an HTTP URL or invalid data URL - return as is safely
    return base64 || "";
  }
  const fileRef = ref(storage, path);
  const finalMetadata: UploadMetadata = {
    cacheControl: "public, max-age=31536000",
    contentType: "image/jpeg",
    ...metadata,
  };
  await uploadString(fileRef, base64, 'data_url', finalMetadata);
  return await getDownloadURL(fileRef);
};

export const deleteImageFromStorage = async (path: string) => {
  const fileRef = ref(storage, path);
  try {
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting image from storage: ", error);
  }
};


export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
