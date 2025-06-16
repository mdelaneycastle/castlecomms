// firebase-init.js
const firebaseConfig = {
  apiKey: "AIzaSyDJvHNZB_pzhytD7yLa69auStrZBk2SEHk",
  authDomain: "castle-comms.firebaseapp.com",
  projectId: "castle-comms",
  storageBucket: "castle-comms.appspot.com",
  messagingSenderId: "959264765744",
  appId: "1:959264765744:web:7aee345a37673f720cfaf5",
  measurementId: "G-NLS757VMJ8"
};

firebase.initializeApp(firebaseConfig);

// If you absolutely need Realtime Database elsewhere, 
// you can load the compat SDK and call firebase.database(), 
// but for this admin page it’s not needed.
