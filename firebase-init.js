// firebase-init.js
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

// 1) Initialize the core Firebase SDK
firebase.initializeApp(firebaseConfig);

// 2) Realtime Database (compat)
//    Only set window.db if the compat SDK is loaded
try {
  if (typeof firebase.database === "function") {
    window.db = firebase.database();
    console.log("✅ Realtime Database initialized");
  } else {
    console.log("⛔️ Skipping DB init: firebase.database() not available");
  }
} catch (e) {
  console.warn("⛔️ Realtime DB SDK missing—skipping window.db:", e);
}

// 3) Storage (compat)
//    Only set window.storage if the compat SDK is loaded
try {
  if (typeof firebase.storage === "function") {
    window.storage = firebase.storage();
    console.log("✅ Storage initialized");
  } else {
    console.log("⛔️ Skipping Storage init: firebase.storage() not available");
  }
} catch (e) {
  console.warn("⛔️ Storage SDK missing—skipping window.storage:", e);
}
