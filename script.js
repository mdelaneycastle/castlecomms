console.log("🔌 script.js initialized");

const bell        = document.getElementById("notification-bell");
const countBadge  = document.getElementById("notification-count");

let mentionCount = 0;

function showBell(count) {
  if (bell && countBadge) {
    countBadge.textContent = count;
    bell.classList.remove("hidden");
  }
}

// Listen for new posts and check if the current user was mentioned
if (db && firebase.auth().currentUser) {
  const uid = firebase.auth().currentUser.uid;
  db.ref("posts").on("child_added", snap => {
    const post = snap.val();
    if (post.tagged && post.tagged.includes(uid)) {
      mentionCount++;
      showBell(mentionCount);
    }
  });

  bell?.addEventListener("click", () => {
    mentionCount = 0;
    bell.classList.add("hidden");
    // Optional: open a "Mentions" page or scroll to newsfeed
    window.location.href = "newsfeed.html"; // or scrollTo
  });
}

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

function highlightMentions(text) {
  return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn  = document.getElementById("close-btn");
  const sidebar   = document.getElementById("sidebar");
  if (toggleBtn && sidebar) toggleBtn.onclick = () => sidebar.classList.add("show");
  if (closeBtn  && sidebar) closeBtn.onclick  = () => sidebar.classList.remove("show");
}

document.addEventListener("DOMContentLoaded", () => {
  setupSidebarEvents();

  let allUsers = []; // populate on load
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    allUsers = await listUsers(); // for mentions
  }
});

  firebase.auth().onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";

    const token = await user.getIdTokenResult();
    const isAdmin = !!token.claims.admin;
    const adminLink = document.getElementById("admin-link");

    if (adminLink) {
      adminLink.style.display = isAdmin ? "list-item" : "none";
    }

    const db       = window.db;
    const storage  = window.storage;
    const postForm = document.getElementById("post-form");
    const feed     = document.getElementById("feed");

    const messageInput = document.getElementById("message");
const mentionList = document.getElementById("mention-suggestions");

if (messageInput && mentionList) {
  let currentMention = "";

  messageInput.addEventListener("input", () => {
    const cursor = messageInput.selectionStart;
    const text = messageInput.value.slice(0, cursor);
    const match = text.match(/@(\w+)$/);
    if (match) {
      currentMention = match[1].toLowerCase();
      const matches = allUsers.filter(u => {
        const name = u.displayName?.toLowerCase() || "";
        const handle = u.email?.split("@")[0].toLowerCase();
        return name.includes(currentMention) || handle.includes(currentMention);
      }).slice(0, 5); // max 5 suggestions

      mentionList.innerHTML = "";
      matches.forEach(u => {
        const li = document.createElement("li");
        li.textContent = u.displayName || u.email;
        li.onclick = () => {
          const before = messageInput.value.slice(0, cursor - currentMention.length - 1);
          const after  = messageInput.value.slice(cursor);
          const mentionTag = "@" + (u.displayName || u.email.split("@")[0]);
          messageInput.value = before + mentionTag + " " + after;
          mentionList.innerHTML = "";
          messageInput.focus();
        };
        mentionList.appendChild(li);
      });

      const rect = messageInput.getBoundingClientRect();
      mentionList.style.top = rect.bottom + "px";
      mentionList.style.left = rect.left + "px";
      mentionList.style.display = "block";
    } else {
      mentionList.innerHTML = "";
      currentMention = "";
    }
  });
}

    if (db && storage && postForm && feed) {
      postForm.addEventListener("submit", async e => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        const msg  = document.getElementById("message").value.trim();

        const taggedUsernames = Array.from(msg.matchAll(/@(\w+)/g)).map(m => m[1].toLowerCase());
        const allUsersSnap = await db.ref("users").once("value");
        const allUsers = allUsersSnap.val() || {};
        const taggedUIDs = [];

        for (const [uid, userData] of Object.entries(allUsers)) {
          if (userData.name && taggedUsernames.includes(userData.name.toLowerCase())) {
            taggedUIDs.push(uid);
          }
        }

        const fileInp = document.getElementById("image-file");
        const file    = fileInp.files[0];
        let imageURL  = null;

        if (file) {
          const postId = db.ref("posts").push().key;
          const path   = `posts/${postId}/${Date.now()}_${file.name}`;
          const ref    = storage.ref(path);
          await ref.put(file);
          imageURL = await ref.getDownloadURL();
        }

        const usersnap = await db.ref(`users/${user.uid}`).once("value");
        const userdata = usersnap.val() || {};
        const postRef  = db.ref("posts").push();
        await postRef.set({
          postId:    postRef.key,
          name:      userdata.name || user.displayName || user.email || "Anonymous",
          role:      userdata.role || "User",
          message:   msg,
          imageURL:  imageURL || null,
          timestamp: Date.now(),
          reaction:  null,
          tagged:    taggedUIDs
        });

        postForm.reset();
      });

      // Cache user data
if (!window.userCache) {
  const snap = await db.ref("users").once("value");
  window.userCache = snap.val() || {};
}

      function displayPost(post) {
        const initials = post.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

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
          <div class="post-message">${formatMessageWithMentions(post.message, post.tagged || [])}</div>
        `;

        function formatMessageWithMentions(text, taggedUIDs) {
  const userCache = window.userCache || {};
  const uidToName = {};
  taggedUIDs.forEach(uid => {
    if (userCache[uid]?.name) {
      uidToName[uid] = userCache[uid].name;
    }
  });

  const validMentions = Object.values(uidToName).reduce((acc, name) => {
    acc[name.toLowerCase()] = name;
    return acc;
  }, {});

  return text.replace(/@(\w+)/g, (match, handle) => {
    const lower = handle.toLowerCase();
    if (validMentions[lower]) {
      return `<span class="mention">@${validMentions[lower]}</span>`;
    }
    return match;
  });
}

        if (post.imageURL) {
          const img = document.createElement("img");
          img.src   = post.imageURL;
          img.alt   = "attachment";
          img.style = "max-width:100%; margin-top:0.5rem;";
          div.appendChild(img);
        }

        div.innerHTML += `
          <div class="post-footer">
            <button class="react-btn">${post.reaction || "➕ React"}</button>
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

        const commentsDiv = div.querySelector(".post-comments");
        db.ref(`posts/${post.postId}/comments`).on("child_added", snap => {
          const c = snap.val();
          const p = document.createElement("p");
          p.textContent = `${new Date(c.timestamp).toLocaleTimeString()}: ${c.text}`;
          commentsDiv.appendChild(p);
        });

        div.querySelector(".comment-form").addEventListener("submit", e => {
          e.preventDefault();
          const text = div.querySelector("input").value.trim();
          if (!text) return;
          db.ref(`posts/${post.postId}/comments`).push({ text, timestamp: Date.now() });
          div.querySelector("input").value = "";
        });

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

      db.ref("posts").on("child_added", snap => {
        const post = snap.val();
        post.postId = post.postId || snap.key;
        displayPost(post);
      });
    }

    const tbody = document.querySelector("#user-table tbody");
    if (tbody) {
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
    }
  });
});
