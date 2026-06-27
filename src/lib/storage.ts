import {
  auth,
  db,
  isFirebaseConfigured
} from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  monthlyIncome: number;
  fcmTokens: string[];
  createdAt: any;
  onboardingCompleted: boolean;
}

export interface Loan {
  loanId: string;
  nickname: string;
  provider: string;
  loanType: string;
  totalAmount: number;
  emiAmount: number;
  totalTenureMonths: number;
  monthsCompleted: number;
  emiDayOfMonth: number;
  nextEmiDate: string; // YYYY-MM-DD
  status: "Active" | "Closed" | "Overdue";
  pendingMissed: boolean; // Flag to indicate if the current month's EMI is flagged as Missed/Pending
  updatedAt: any;
}

// ----------------------------------------------------
// LOCAL STORAGE MOCK STORAGE ENGINE (FALLBACK)
// ----------------------------------------------------

const MOCK_DELAY = 300; // Simulated latency in ms

function getLocalUsers(): Record<string, UserProfile> {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem("emi_manager_users");
  return data ? JSON.parse(data) : {};
}

function saveLocalUsers(users: Record<string, UserProfile>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("emi_manager_users", JSON.stringify(users));
}

function getLocalLoans(uid: string): Loan[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(`emi_manager_loans_${uid}`);
  return data ? JSON.parse(data) : [];
}

function saveLocalLoans(uid: string, loans: Loan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`emi_manager_loans_${uid}`, JSON.stringify(loans));
}

let mockAuthListeners: ((user: UserProfile | null) => void)[] = [];
let currentMockUser: UserProfile | null = null;

if (typeof window !== "undefined") {
  // Initialize mock session if exists
  const savedUser = localStorage.getItem("emi_manager_current_user");
  if (savedUser) {
    currentMockUser = JSON.parse(savedUser);
  }
}

function triggerMockAuth(user: UserProfile | null) {
  currentMockUser = user;
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem("emi_manager_current_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("emi_manager_current_user");
    }
  }
  mockAuthListeners.forEach((cb) => cb(user));
}

// ----------------------------------------------------
// PUBLIC API FOR AUTH & DATABASE
// ----------------------------------------------------

/**
 * Register auth listener
 */
export function subscribeAuth(callback: (user: UserProfile | null) => void): () => void {
  if (isFirebaseConfigured && auth && db) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          callback(userSnap.data() as UserProfile);
        } else {
          // If Firestore is slow or not written yet, send basic info
          callback({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            monthlyIncome: 0,
            fcmTokens: [],
            createdAt: new Date().toISOString(),
            onboardingCompleted: false,
          });
        }
      } else {
        callback(null);
      }
    });
  } else {
    mockAuthListeners.push(callback);
    // Initial call
    setTimeout(() => callback(currentMockUser), 50);
    return () => {
      mockAuthListeners = mockAuthListeners.filter((cb) => cb !== callback);
    };
  }
}

/**
 * Sign Up
 */
export async function signUpUser(email: string, password: string, name: string): Promise<UserProfile> {
  if (isFirebaseConfigured && auth && db) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const profile: UserProfile = {
      uid,
      name,
      email,
      monthlyIncome: 0,
      fcmTokens: [],
      createdAt: new Date().toISOString(), // Fallback if serverTimestamp is not completed yet
      onboardingCompleted: false,
    };
    // Save to Firestore
    await setDoc(doc(db, "users", uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });
    return profile;
  } else {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getLocalUsers();
        // Simple check
        const exists = Object.values(users).some((u) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          reject(new Error("Email already in use."));
          return;
        }

        const uid = `mock-uid-${Date.now()}`;
        const profile: UserProfile = {
          uid,
          name,
          email,
          monthlyIncome: 0,
          fcmTokens: [],
          createdAt: new Date().toISOString(),
          onboardingCompleted: false,
        };

        users[uid] = profile;
        saveLocalUsers(users);
        triggerMockAuth(profile);
        resolve(profile);
      }, MOCK_DELAY);
    });
  }
}

/**
 * Sign In
 */
export async function signInUser(email: string, password: string): Promise<UserProfile> {
  if (isFirebaseConfigured && auth && db) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      throw new Error("User profile not found in database.");
    }
  } else {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getLocalUsers();
        const found = Object.values(users).find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        // In local mode, accept any password for simplicity of the prototype/demonstration
        if (found) {
          triggerMockAuth(found);
          resolve(found);
        } else {
          // If no user exists, create a default mock user for quick evaluation
          if (email.toLowerCase() === "demo@example.com") {
            const uid = "mock-uid-demo";
            const demoUser: UserProfile = {
              uid,
              name: "Demo User",
              email: "demo@example.com",
              monthlyIncome: 65000,
              fcmTokens: [],
              createdAt: new Date().toISOString(),
              onboardingCompleted: true,
            };
            users[uid] = demoUser;
            saveLocalUsers(users);
            // Add some demo loans
            const demoLoans: Loan[] = [
              {
                loanId: "demo-loan-1",
                nickname: "Home Loan",
                provider: "HDFC Bank",
                loanType: "Home Loan",
                totalAmount: 180000,
                emiAmount: 1500,
                totalTenureMonths: 120,
                monthsCompleted: 48,
                emiDayOfMonth: 10,
                nextEmiDate: "2026-07-10",
                status: "Active",
                pendingMissed: false,
                updatedAt: new Date().toISOString(),
              },
              {
                loanId: "demo-loan-2",
                nickname: "Car Loan",
                provider: "Chase Finance",
                loanType: "Vehicle Loan",
                totalAmount: 25000,
                emiAmount: 480,
                totalTenureMonths: 60,
                monthsCompleted: 15,
                emiDayOfMonth: 5,
                nextEmiDate: "2026-07-05",
                status: "Active",
                pendingMissed: false,
                updatedAt: new Date().toISOString(),
              },
              {
                loanId: "demo-loan-3",
                nickname: "Tech Gadget BNPL",
                provider: "Klarna",
                loanType: "Pay Later / BNPL",
                totalAmount: 1200,
                emiAmount: 100,
                totalTenureMonths: 12,
                monthsCompleted: 8,
                emiDayOfMonth: 28,
                nextEmiDate: "2026-06-28",
                status: "Active",
                pendingMissed: true, // Flashed visually!
                updatedAt: new Date().toISOString(),
              }
            ];
            saveLocalLoans(uid, demoLoans);
            triggerMockAuth(demoUser);
            resolve(demoUser);
          } else {
            reject(new Error("Invalid email or user does not exist. (Tip: Use demo@example.com to test)"));
          }
        }
      }, MOCK_DELAY);
    });
  }
}

/**
 * Sign In with Google
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  if (isFirebaseConfigured && auth && db) {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      const profile: UserProfile = {
        uid,
        name: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        monthlyIncome: 0,
        fcmTokens: [],
        createdAt: new Date().toISOString(),
        onboardingCompleted: false,
      };
      await setDoc(userRef, {
        ...profile,
        createdAt: serverTimestamp(),
      });
      return profile;
    }
  } else {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = getLocalUsers();
        const uid = "mock-uid-google";
        const demoGoogleUser: UserProfile = {
          uid,
          name: "Google Explorer",
          email: "googleuser@example.com",
          monthlyIncome: 0,
          fcmTokens: [],
          createdAt: new Date().toISOString(),
          onboardingCompleted: false,
        };
        // Save if not exists
        if (!users[uid]) {
          users[uid] = demoGoogleUser;
          saveLocalUsers(users);
        }
        triggerMockAuth(users[uid]);
        resolve(users[uid]);
      }, MOCK_DELAY);
    });
  }
}

/**
 * Sign Out
 */
export async function signOutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await firebaseSignOut(auth);
  } else {
    triggerMockAuth(null);
  }
}

/**
 * Update Profile (Income and Onboarding status)
 */
export async function updateProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data as any);
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      users[uid] = { ...users[uid], ...data };
      saveLocalUsers(users);
      if (currentMockUser?.uid === uid) {
        triggerMockAuth(users[uid]);
      }
    }
  }
}

/**
 * Add FCM Token for Push Notifications
 */
export async function addFcmToken(uid: string, token: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      const tokens = users[uid].fcmTokens || [];
      if (!tokens.includes(token)) {
        tokens.push(token);
        users[uid].fcmTokens = tokens;
        saveLocalUsers(users);
        if (currentMockUser?.uid === uid) {
          triggerMockAuth(users[uid]);
        }
      }
    }
  }
}

// ----------------------------------------------------
// LOANS COLLECTION ACTIONS
// ----------------------------------------------------

/**
 * Subscribe to Loans List in Real-Time
 */
export function subscribeLoans(
  uid: string,
  callback: (loans: Loan[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const loansRef = collection(db, "users", uid, "loans");
    const q = query(loansRef, orderBy("emiDayOfMonth", "asc"));
    return onSnapshot(q, (snap) => {
      const loansList: Loan[] = [];
      snap.forEach((docSnap) => {
        loansList.push({
          loanId: docSnap.id,
          ...docSnap.data(),
        } as Loan);
      });
      callback(loansList);
    });
  } else {
    // Local storage subscription simulator
    const checkAndTrigger = () => {
      callback(getLocalLoans(uid));
    };
    checkAndTrigger();
    
    // Simple polling listener for multi-component reactivity if needed, or trigger immediately
    const interval = setInterval(checkAndTrigger, 1000);
    return () => clearInterval(interval);
  }
}

/**
 * Add Loan
 */
export async function addLoan(uid: string, loan: Omit<Loan, "loanId" | "updatedAt">): Promise<string> {
  if (isFirebaseConfigured && db) {
    const loansRef = collection(db, "users", uid, "loans");
    // Generate a temporary new ref to get ID
    const newDocRef = doc(loansRef);
    const loanId = newDocRef.id;
    const loanDoc: Loan = {
      ...loan,
      loanId,
      updatedAt: new Date().toISOString(), // Firestore serverTimestamp can also be used but ISO string simplifies sync calculations
    };
    await setDoc(newDocRef, loanDoc);
    return loanId;
  } else {
    return new Promise((resolve) => {
      setTimeout(() => {
        const loans = getLocalLoans(uid);
        const loanId = `loan-${Date.now()}`;
        const newLoan: Loan = {
          ...loan,
          loanId,
          updatedAt: new Date().toISOString(),
        };
        loans.push(newLoan);
        saveLocalLoans(uid, loans);
        resolve(loanId);
      }, MOCK_DELAY);
    });
  }
}

/**
 * Update Loan
 */
export async function updateLoan(
  uid: string,
  loanId: string,
  data: Partial<Loan>
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const loanRef = doc(db, "users", uid, "loans", loanId);
    await updateDoc(loanRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    } as any);
  } else {
    return new Promise((resolve) => {
      setTimeout(() => {
        const loans = getLocalLoans(uid);
        const index = loans.findIndex((l) => l.loanId === loanId);
        if (index !== -1) {
          loans[index] = {
            ...loans[index],
            ...data,
            updatedAt: new Date().toISOString(),
          };
          saveLocalLoans(uid, loans);
        }
        resolve();
      }, MOCK_DELAY);
    });
  }
}

/**
 * Delete Loan
 */
export async function deleteLoan(uid: string, loanId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const loanRef = doc(db, "users", uid, "loans", loanId);
    await deleteDoc(loanRef);
  } else {
    return new Promise((resolve) => {
      setTimeout(() => {
        const loans = getLocalLoans(uid);
        const filtered = loans.filter((l) => l.loanId !== loanId);
        saveLocalLoans(uid, filtered);
        resolve();
      }, MOCK_DELAY);
    });
  }
}
