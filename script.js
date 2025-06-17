// ─── helper to call your Callable function ───
async function listUsers() {
  const auth = firebase.auth();
  // force a refresh so your admin:true claim is in the token
  await auth.currentUser.getIdToken(true);

  // grab the Functions instance in europe-west1
  const functions = firebase.app().functions("europe-west1");
  const fn = functions.httpsCallable("listUsers");

  // call it (empty object => POST)
  const res = await fn({});
  return res.data.users; // array of { uid, email, displayName }
}


// ─── sidebar toggle logic ───
function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn  = document.getElementById("close-btn");
  const sidebar   = document.getElementById("sidebar");

  if (toggleBtn && sidebar) toggleBtn.onclick = () => sidebar.classList.add("show");
  if (closeBtn  && sidebar) closeBtn.onclick  = () => sidebar.classList.remove("show");
}


// ─── when the DOM is ready ───
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarEvents();

  const db       = window.db;
  const postForm = document.getElementById("post-form");
  const feed     = document.getElementById("feed");

  // ─── post submission ───
  function submitPost(name, role, message) {
    const postRef = db.ref("posts").push();
    const postId  = postRef.key;
    if (!postId) return console.error("Failed to generate post ID");

    postRef.set({
      postId, name, role, message,
      timestamp: Date.now(),
      reaction: null
    }).catch(err => console.error("Post save error:", err));
  }

  // ─── render a single post ───
  function displayPost(post) {
    const postId   = post.postId || "undefined";
    const initials = post.name
      .split(" ").map(w => w[0]).join("")
      .toUpperCase().slice(0,2);

    const div = document.createElement("div");
    div.className   = "post";
    div.dataset.id  = postId;
    div.innerHTML   = `
      <div class="post-header">
        <div class="post-avatar">${initials}</div>
        <div class="post-info">
          <div class="post-name">${post.name}</div>
          <div class="post-role">${post.role || "User"}</div>
          <div class="post-time">${new Date(post.timestamp).toLocaleString()}</div>
        </div>
      </div>
      <div class="post-message">${post.message}</div>
      <div class="post-footer">
        <div>
          <button class="react-btn">${post.reaction || "➕ React"}</button>
          <div class="emoji-picker hidden"><span>👏</span><span>❤️</span><span>💡</span><span>👍</span><span>🤔</span></div>
        </div>
      </div>
      <div class="post-comments"></div>
      <form class="comment-form" data-postid="${postId}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Reply</button>
      </form>
    `;
    feed.prepend(div);

    // comments listener
    const commentsDiv = div.querySelector(".post-comments");
    db.ref(`posts/${postId}/comments`).on("child_added", snap => {
      const d = snap.val();
      const p = document.createElement("p");
      p.textContent = `${new Date(d.timestamp).toLocaleTimeString()}: ${d.text}`;
      commentsDiv.appendChild(p);
    });

    // comment form handler
    div.querySelector(".comment-form").addEventListener("submit", e => {
      e.preventDefault();
      const text = div.querySelector(".comment-form input").value.trim();
      if (!text) return;
      db.ref(`posts/${postId}/comments`).push({
        text,
        timestamp: Date.now()
      }).catch(err => console.error("Comment error:", err));
      div.querySelector(".comment-form input").value = "";
    });

    // reactions UI
    const btn    = div.querySelector(".react-btn");
    const picker = div.querySelector(".emoji-picker");
    btn.addEventListener("click", () => picker.classList.toggle("hidden"));
    picker.querySelectorAll("span").forEach(span => {
      span.addEventListener("click", () => {
        const r = span.textContent;
        btn.textContent = r;
        picker.classList.add("hidden");
        db.ref(`posts/${postId}`).update({ reaction: r })
          .catch(err => console.error("Reaction error:", err));
      });
    });
  }

  // ─── listen for new posts ───
  function listenForPosts() {
    db.ref("posts").on("child_added", snap => {
      const post = snap.val();
      post.postId = post.postId || snap.key;
      displayPost(post);
    });
  }

  // ─── wire up post form ───
  if (postForm) {
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      const user = firebase.auth().currentUser;
      db.ref(`users/${user.uid}`).once("value").then(snap => {
        const data = snap.val() || {};
        const name = data.name || user.displayName || user.email || "Anonymous";
        const role = data.role || "User";
        const message = document.getElementById("message").value.trim();
        if (message) submitPost(name, role, message);
        postForm.reset();
      }).catch(err => console.error("Failed to fetch user data:", err));
    });
    listenForPosts();
  }

  // ─── ADMIN‐PAGE LOGIC ───
  const tbody = document.querySelector("#user-table tbody");
  if (tbody) {
    // only on admin.html
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
