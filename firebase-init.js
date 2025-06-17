const firebaseConfig = {
  apiKey: "AIzaSyDJvHNZB_pzhytD7yLa69auStrZBk2SEHk",
  authDomain: "castle-comms.firebaseapp.com",
  databaseURL: "https://castle-comms-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "castle-comms",
  storageBucket: "castle-comms.appspot.com",
  messagingSenderId: "959264765744",
  appId: "1:959264765744:web:7aee345a37673f720cfaf5",
  measurementId: "G-NLS757VMJ8"
};

firebase.initializeApp(firebaseConfig);

// Realtime DB init
try {
  if (typeof firebase.database === "function") {
    window.db = firebase.database();
  } else {
    console.log("⛔️ Skipping DB init: firebase.database() not available");
  }
} catch (e) {
  console.warn("⛔️ Realtime DB SDK missing — skipping window.db:", e);
}

// ✅ Storage init
try {
  if (typeof firebase.storage === "function") {
    window.storage = firebase.storage();
  } else {
    console.log("⛔️ Skipping Storage init: firebase.storage() not available");
  }
} catch (e) {
  console.warn("⛔️ Firebase Storage SDK missing — skipping window.storage:", e);
}
