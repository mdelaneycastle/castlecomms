
async function listUsers() {
  // 1) Get the current user and force-refresh the token so it includes admin:true
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Not signed in");

  const idToken = await user.getIdToken(true);

  // 2) Call the raw HTTP endpoint, passing the token in Authorization
  const res = await fetch(
    "https://europe-west1-castle-comms.cloudfunctions.net/listUsers",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      // onCall endpoints expect {"data": <your args>}
      body: JSON.stringify({ data: {} }),
    }
  );

  // 3) Parse the JSON
  const payload = await res.json();

  // 4) If not OK, bubble up the server‐side error message
  if (!res.ok) {
    const msg = payload.error?.message || res.statusText;
    throw new Error(msg);
  }

  // 5) Success! The returned data is under payload.data
  return payload.data.users;  // array of { uid, email, displayName }
}


// ─── 2) Sidebar toggle logic ───
function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn  = document.getElementById("close-btn");
  const sidebar   = document.getElementById("sidebar");
  if (toggleBtn && sidebar) toggleBtn.onclick = () => sidebar.classList.add("show");
  if (closeBtn  && sidebar) closeBtn.onclick  = () => sidebar.classList.remove("show");
}


// ─── 3) DOM ready ───
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarEvents();

  // ——— A) Feed & posting logic ———
  const db       = window.db;                     // from firebase-init.js
  const postForm = document.getElementById("post-form");
  const feed     = document.getElementById("feed");
  if (db && postForm && feed) {
    // submit a post
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      const user = firebase.auth().currentUser;
      db.ref(`users/${user.uid}`).once("value").then(snap => {
        const data = snap.val() || {};
        const name = data.name || user.displayName || user.email || "Anonymous";
        const role = data.role || "User";
        const msg  = document.getElementById("message").value.trim();
        if (!msg) return;
        const ref = db.ref("posts").push();
        ref.set({ 
          postId: ref.key, name, role, message: msg, 
          timestamp: Date.now(), reaction: null 
        });
        postForm.reset();
      });
    });

    // display a post
    function displayPost(post) {
      const initials = post.name
        .split(" ").map(w=>w[0]).join("")
        .toUpperCase().slice(0,2);
      const div = document.createElement("div");
      div.className  = "post";
      div.dataset.id = post.postId;
      div.innerHTML  = `
        <div class="post-header">
          <div class="post-avatar">${initials}</div>
          <div class="post-info">
            <div class="post-name">${post.name}</div>
            <div class="post-role">${post.role}</div>
            <div class="post-time">${new Date(post.timestamp).toLocaleString()}</div>
          </div>
        </div>
        <div class="post-message">${post.message}</div>
        <div class="post-footer">
          <button class="react-btn">${post.reaction||"➕ React"}</button>
          <div class="emoji-picker hidden">
            <span>👏</span><span>❤️</span><span>💡</span><span>👍</span><span>🤔</span>
          </div>
        </div>
        <div class="post-comments"></div>
        <form class="comment-form" data-postid="${post.postId}">
          <input type="text" placeholder="Write a comment..." required />
          <button type="submit">Reply</button>
        </form>
      `;
      feed.prepend(div);

      // comments
      const commentsDiv = div.querySelector(".post-comments");
      db.ref(`posts/${post.postId}/comments`)
        .on("child_added", snap => {
          const c = snap.val();
          const p = document.createElement("p");
          p.textContent = `${new Date(c.timestamp).toLocaleTimeString()}: ${c.text}`;
          commentsDiv.appendChild(p);
        });

      // comment form
      div.querySelector(".comment-form")
        .addEventListener("submit", e => {
          e.preventDefault();
          const text = div.querySelector("input").value.trim();
          if (!text) return;
          db.ref(`posts/${post.postId}/comments`)
            .push({ text, timestamp: Date.now() });
          div.querySelector("input").value = "";
        });

      // reactions
      const btn    = div.querySelector(".react-btn");
      const picker = div.querySelector(".emoji-picker");
      btn.addEventListener("click", () => picker.classList.toggle("hidden"));
      picker.querySelectorAll("span").forEach(s => {
        s.addEventListener("click", () => {
          const r = s.textContent;
          btn.textContent = r;
          picker.classList.add("hidden");
          db.ref(`posts/${post.postId}`)
            .update({ reaction: r });
        });
      });
    }

    // listen for posts
    db.ref("posts").on("child_added", snap => {
      const post = snap.val();
      post.postId = post.postId || snap.key;
      displayPost(post);
    });
  }

  // ——— B) Admin‐page logic ———
  const tbody = document.querySelector("#user-table tbody");
  if (tbody) {
    firebase.auth().onAuthStateChanged(async user => {
      if (!user) return window.location.href = "index.html";
      try {
        const users = await listUsers();
        tbody.innerHTML = "";
        users.forEach(u => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${u.uid}</td>
            <td>${u.email       || "-"}</td>
            <td>${u.displayName || "-"}</td>
          `;
          tbody.appendChild(row);
        });
      } catch (e) {
        console.error(e);
        alert("❌ You do not have permission to view users.");
      }
    });
  }
});
