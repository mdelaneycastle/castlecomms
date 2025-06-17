console.log("🔌 script.js initialized");

// ─── Helper: Create a new user ───
async function createUser({ email, password, displayName, admin: wantAdmin }) {
  const user  = firebase.auth().currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken(true);

  const res = await fetch(
    "https://europe-west1-castle-comms.cloudfunctions.net/createUserHttp",
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, displayName, admin: wantAdmin })
    }
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || res.statusText);
  return payload;
}

// ─── Helper: List users ───
async function listUsers() {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken(true);

  const res = await fetch(
    "https://europe-west1-castle-comms.cloudfunctions.net/listUsersHttp",
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
    }
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || res.statusText);
  return payload.users;
}

// Extend your admin.html page to include an "Edit" button in the table
// and a hidden form to update display name or password

// Update script.js to include the following:

function addEditButtonToRow(row, user) {
  const btn = document.createElement("button");
  btn.textContent = "Edit";
  btn.onclick = () => {
    const newDisplayName = prompt("Enter new display name:", user.displayName || "");
    const newPassword = prompt("Enter new password (leave blank to skip):", "");
    if (newDisplayName !== null || newPassword !== "") {
      updateUser(user.uid, newDisplayName, newPassword);
    }
  };
  const td = document.createElement("td");
  td.appendChild(btn);
  row.appendChild(td);
}

async function updateUser(uid, displayName, password) {
  const currentUser = firebase.auth().currentUser;
  const token = await currentUser.getIdToken(true);

  const res = await fetch("https://europe-west1-castle-comms.cloudfunctions.net/updateUserHttp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ uid, displayName, password })
  });

  const payload = await res.json();
  if (!res.ok) {
    alert("❌ " + (payload.error || res.statusText));
    return;
  }
  alert("✅ User updated");
  location.reload();
}

// ─── Sidebar toggle logic ───
function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn  = document.getElementById("close-btn");
  const sidebar   = document.getElementById("sidebar");
  if (toggleBtn && sidebar) toggleBtn.onclick = () => sidebar.classList.add("show");
  if (closeBtn  && sidebar) closeBtn.onclick  = () => sidebar.classList.remove("show");
}

// ─── DOM ready ───
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarEvents();

  // ─── Auth-redirect (common) ───
  firebase.auth().onAuthStateChanged(async user => {
  if (!user) return window.location.href = "index.html";

  const token = await user.getIdTokenResult();
  const isAdmin = !!token.claims.admin;

  if (isAdmin) {
    const nav = document.querySelector("#sidebar ul");
    if (nav && !document.querySelector("#admin-link")) {
  const li = document.createElement("li");
  li.id = "admin-link";
  const link = document.createElement("a");
  link.href = "admin.html";
  link.textContent = "⚙️ Admin";
  li.appendChild(link);
  nav.appendChild(li);
}
  }
});

  // ─── A) Newsfeed logic ───
  const db       = window.db;
  const storage  = window.storage;
  const postForm = document.getElementById("post-form");
  const feed     = document.getElementById("feed");

  if (db && storage && postForm && feed) {
    // Submit new posts (with optional image)
    postForm.addEventListener("submit", async e => {
      e.preventDefault();
      const user    = firebase.auth().currentUser;
      const msg     = document.getElementById("message").value.trim();
      const fileInp = document.getElementById("image-file");
      const file    = fileInp.files[0]; // may be undefined
      let imageURL  = null;

      // 1) Upload image if present
      if (file) {
        const postId = db.ref("posts").push().key;
        const path   = `posts/${postId}/${Date.now()}_${file.name}`;
        const ref    = storage.ref(path);
        await ref.put(file);
        imageURL = await ref.getDownloadURL();
      }

      // 2) Push post data
      const usersnap = await db.ref(`users/${user.uid}`).once("value");
      const userdata = usersnap.val() || {};
      const postRef  = db.ref("posts").push();
      await postRef.set({
        postId:      postRef.key,
        name:        userdata.name       || user.displayName || user.email || "Anonymous",
        role:        userdata.role       || "User",
        message:     msg,
        imageURL:    imageURL,          // null or URL
        timestamp:   Date.now(),
        reaction:    null
      });

      postForm.reset();
    });

    // Display a single post
    function displayPost(post) {
      const initials = post.name
        .split(" ").map(w => w[0]).join("")
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
      `;
      // image, if any
      if (post.imageURL) {
        const img = document.createElement("img");
        img.src   = post.imageURL;
        img.alt   = "attachment";
        img.style = "max-width:100%; margin-top:0.5rem;";
        div.appendChild(img);
      }
      div.innerHTML += `
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

      // Comments
      const commentsDiv = div.querySelector(".post-comments");
      db.ref(`posts/${post.postId}/comments`)
        .on("child_added", snap => {
          const c = snap.val();
          const p = document.createElement("p");
          p.textContent = `${new Date(c.timestamp).toLocaleTimeString()}: ${c.text}`;
          commentsDiv.appendChild(p);
        });

      // Comment form
      div.querySelector(".comment-form")
        .addEventListener("submit", e => {
          e.preventDefault();
          const text = div.querySelector("input").value.trim();
          if (!text) return;
          db.ref(`posts/${post.postId}/comments`)
            .push({ text, timestamp: Date.now() });
          div.querySelector("input").value = "";
        });

      // Reaction picker
      const btn    = div.querySelector(".react-btn");
      const picker = div.querySelector(".emoji-picker");
      btn.addEventListener("click", () => picker.classList.toggle("hidden"));
      picker.querySelectorAll("span").forEach(s => {
        s.addEventListener("click", () => {
          const r = s.textContent;
          btn.textContent = r;
          picker.classList.add("hidden");
          db.ref(`posts/${post.postId}`).update({ reaction: r });
        });
      });
    }

    // Stream posts
    db.ref("posts").on("child_added", snap => {
      const post = snap.val();
      post.postId = post.postId || snap.key;
      displayPost(post);
    });
  }

  // ─── B) Admin logic ───
  const tbody = document.querySelector("#user-table tbody");
  if (tbody) {
    firebase.auth().onAuthStateChanged(async user => {
      if (!user) return window.location.href = "index.html";

      // List users
      try {
        const users = await listUsers();
        tbody.innerHTML = "";
        users.forEach(u => {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${u.uid}</td><td>${u.email || "-"}</td><td>${u.displayName || "-"}</td>`;
  addEditButtonToRow(row, u);
  tbody.appendChild(row);
});
      } catch (e) {
        console.error(e);
        alert("❌ You do not have permission to view users.");
      }

      // Create‐user form
      const form = document.getElementById("create-user-form");
      if (form) {
        form.addEventListener("submit", async e => {
          e.preventDefault();
          const email       = document.getElementById("new-email").value.trim();
          const password    = document.getElementById("new-password").value;
          const displayName = document.getElementById("new-displayName").value.trim();
          const wantAdmin   = document.getElementById("new-admin").checked;
          try {
            const newUser = await createUser({ email, password, displayName, admin: wantAdmin });
            alert(`✅ Created user ${newUser.uid}`);
            form.reset();
            // Refresh list
            tbody.innerHTML = "";
            (await listUsers()).forEach(u => {
              const r = document.createElement("tr");
              r.innerHTML = `<td>${u.uid}</td><td>${u.email||"-"}</td><td>${u.displayName||"-"}</td>`;
              tbody.appendChild(r);
            });
          } catch (err) {
            console.error("Create user failed:", err);
            alert("❌ " + err.message);
          }
        });
      }
    });
  }
});

// ─── Inject Admin link if user is admin ───
firebase.auth().onAuthStateChanged(async user => {
  if (!user) return;

  const token = await user.getIdTokenResult();
  if (token.claims.admin) {
    const tryInjectAdminLink = () => {
      const nav = document.querySelector("#sidebar nav");
      if (nav && !document.querySelector("#admin-link")) {
        const link = document.createElement("a");
        link.href = "admin.html";
        link.id = "admin-link";
        link.textContent = "Admin";
        nav.appendChild(link);
      }
    };

    // Sidebar may load slightly later — poll briefly until it's ready
    let attempts = 0;
    const interval = setInterval(() => {
      tryInjectAdminLink();
      if (document.querySelector("#admin-link") || ++attempts > 10) {
        clearInterval(interval);
      }
    }, 300);
  }
});
