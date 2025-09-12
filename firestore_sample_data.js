/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,          // ✅ tambahin ini
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Your Firebase config - replace with your own
const firebaseConfig = {
  apiKey: "AIzaSyA3d0-uYWGob0_Rd4DSr--enC8MaudBmu0",
  authDomain: "kendalikas-dc227.firebaseapp.com",
  projectId: "kendalikas-dc227",
  storageBucket: "kendalikas-dc227.firebasestorage.app",
  messagingSenderId: "192223553027",
  appId: "1:192223553027:web:9922ee5d193226bf42d036",
  measurementId: "G-PT69WLETYP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Function to add a single transaction document
async function addTransaction(userId) {
  try {
    const docRef = await addDoc(collection(db, "transactions"), {
      userId: userId,
      tableId: "table123",
      nama: "Gaji Bulanan",
      jenis: "pemasukan",
      jumlah: 5000000,
      tanggal: "2023-09-11",
      kategori: "Gaji",
      proofUrl: "",
      uploader: "user@example.com",
      createdAt: serverTimestamp()
    });
    console.log("Transaction added with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding transaction: ", e);
  }
}
*/


  // Import core Firebase
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
  import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

  // 🔹 Import Firestore lengkap
  import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    query,        // ✅ WAJIB untuk bikin query
    where,        // ✅ dipakai untuk filter
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc
  } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

  // Firebase Config (pastikan storageBucket benar)
  const firebaseConfig = {
    apiKey: "AIzaSyA3d0-uYWGob0_Rd4DSr--enC8MaudBmu0",
    authDomain: "kendalikas-dc227.firebaseapp.com",
    projectId: "kendalikas-dc227",
    storageBucket: "kendalikas-dc227.appspot.com",  // ✅ perbaiki jadi appspot.com
    messagingSenderId: "192223553027",
    appId: "1:192223553027:web:9922ee5d193226bf42d036",
    measurementId: "G-PT69WLETYP"
  };

  // Init Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  console.log("typeof query =", typeof query); // ✅ cek apakah query sudah terimport

  // Contoh fungsi pakai query
  function subscribeTransactions(tableId) {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, where("tableId", "==", tableId));
    onSnapshot(q, (snapshot) => {
      console.log("Transactions snapshot:", snapshot.docs.map(d => d.data()));
    });
  }


// Function to add multiple collaborators using batch write
async function addCollaboratorsBatch(userId) {
  const batch = writeBatch(db);
  const collaboratorsRef = collection(db, "collaborators");

  const collaborators = [
    {
      userId: userId,
      tableId: "table123",
      name: "John Doe",
      email: "john@example.com",
      photoURL: "",
      role: "viewer"
    },
    {
      userId: userId,
      tableId: "table123",
      name: "Jane Smith",
      email: "jane@example.com",
      photoURL: "",
      role: "editor"
    }
  ];

  collaborators.forEach(collab => {
    const docRef = doc(collaboratorsRef);
    batch.set(docRef, collab);
  });

  try {
    await batch.commit();
    console.log("Batch collaborators added successfully");
  } catch (e) {
    console.error("Error adding batch collaborators: ", e);
  }
}

// Wait for user to be authenticated before adding data
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is signed in:", user.uid);
    addTransaction(user.uid);
    addCollaboratorsBatch(user.uid);
  } else {
    console.log("User is not signed in");
  }
});
