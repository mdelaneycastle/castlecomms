console.log("🔌 script.js initialized");

// ─── Helper: Create a new user ───
async function createUser({ email, password, displayName, admin: wantAdmin }) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("Authentication required. Please sign in first.");
    }

    // Validate input
    if (!email || !window.sharedComponents.isValidEmail(email)) {
      throw new Error("Please provide a valid email address.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const token = await user.getIdToken(true);

    const res = await fetch(
      "https://europe-west1-castle-comms.cloudfunctions.net/createUserHttp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, displayName, admin: wantAdmin })
      }
    );
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    const payload = await res.json();
    console.log("✅ User created successfully:", payload);
    return payload;
    
  } catch (error) {
    console.error("❌ Create user failed:", error);
    throw new Error(window.handleFirebaseError(error, "User creation"));
  }
}

// ─── Helper: List users ───
async function listUsers() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("Authentication required. Please sign in first.");
    }

    const token = await user.getIdToken(true);

    const res = await fetch(
      "https://europe-west1-castle-comms.cloudfunctions.net/listUsersHttp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    const payload = await res.json();
    console.log("✅ Users listed successfully");
    return payload.users || [];
    
  } catch (error) {
    console.error("❌ List users failed:", error);
    throw new Error(window.handleFirebaseError(error, "User listing"));
  }
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
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error("Authentication required. Please sign in first.");
    }

    // Validate input
    if (!uid) {
      throw new Error("User ID is required.");
    }
    if (password && password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const token = await currentUser.getIdToken(true);

    const res = await fetch("https://europe-west1-castle-comms.cloudfunctions.net/updateUserHttp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ uid, displayName, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();
    console.log("✅ User updated successfully:", payload);
    alert("✅ User updated successfully");
    location.reload();
    
  } catch (error) {
    console.error("❌ Update user failed:", error);
    const errorMessage = window.handleFirebaseError(error, "User update");
    alert("❌ " + errorMessage);
  }
}

function highlightMentions(text) {
  return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

// ─── DOM Ready ───
document.addEventListener("DOMContentLoaded", () => {

  const bell = document.getElementById("notification-bell");
  const countBadge = document.getElementById("notification-count");
  let mentionCount = 0;

  function showBell(count) {
    if (bell && countBadge) {
      countBadge.textContent = count;
      bell.classList.remove("hidden");
    }
  }

  let allUsers = [];
  firebase.auth().onAuthStateChanged(async user => {
    if (user) allUsers = await listUsers();
  });

  firebase.auth().onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";

    // Use the new authorization utilities
    await window.authUtils.toggleAdminElements(user);

    const db = window.db;
    const storage = window.storage;
    const postForm = document.getElementById("post-form");
    const feed = document.getElementById("feed");
    const messageInput = document.getElementById("message");
    const mentionList = document.getElementById("mention-suggestions");

    if (bell && db && user) {
      const uid = user.uid;
      db.ref("posts").on("child_added", snap => {
        const post = snap.val();
        if (post.tagged && post.tagged.includes(uid)) {
          mentionCount++;
          showBell(mentionCount);
        }
      });
      bell.addEventListener("click", () => {
        mentionCount = 0;
        bell.classList.add("hidden");
        window.location.href = "newsfeed.html";
      });
    }

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
          }).slice(0, 5);

          mentionList.innerHTML = "";
          matches.forEach(u => {
            const li = document.createElement("li");
            li.textContent = u.displayName || u.email;
            li.onclick = () => {
              const before = messageInput.value.slice(0, cursor - currentMention.length - 1);
              const after = messageInput.value.slice(cursor);
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
        
        const submitButton = postForm.querySelector('button[type="submit"]');
        const messageInput = document.getElementById("message");
        const imageInput = document.getElementById("image-file");
        
        try {
          const user = firebase.auth().currentUser;
          if (!user) {
            throw new Error("You must be signed in to post.");
          }

          const msg = messageInput.value.trim();
          if (!msg) {
            throw new Error("Please enter a message before posting.");
          }

          // Show loading state
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Posting...";
          }

          // Process tagged users
          const taggedUsernames = Array.from(msg.matchAll(/@(\w+)/g)).map(m => m[1].toLowerCase());
          let taggedUIDs = [];
          
          if (taggedUsernames.length > 0) {
            try {
              const allUsersSnap = await db.ref("users").once("value");
              const allUsers = allUsersSnap.val() || {};
              
              for (const [uid, userData] of Object.entries(allUsers)) {
                if (userData.name && taggedUsernames.includes(userData.name.toLowerCase())) {
                  taggedUIDs.push(uid);
                }
              }
            } catch (error) {
              console.warn("⚠️ Could not process user mentions:", error);
              // Continue without mentions rather than failing
            }
          }

          // Handle file upload
          let imageURL = null;
          const file = imageInput.files[0];
          
          if (file) {
            // Validate file
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
              throw new Error("Image file must be smaller than 10MB.");
            }
            if (!file.type.startsWith('image/')) {
              throw new Error("Please select a valid image file.");
            }

            try {
              const postId = db.ref("posts").push().key;
              const path = `posts/${postId}/${Date.now()}_${file.name}`;
              const ref = storage.ref(path);
              await ref.put(file);
              imageURL = await ref.getDownloadURL();
            } catch (error) {
              throw new Error("Failed to upload image: " + error.message);
            }
          }

          // Get user data and create post
          const usersnap = await db.ref(`users/${user.uid}`).once("value");
          const userdata = usersnap.val() || {};
          const postRef = db.ref("posts").push();
          
          await postRef.set({
            postId: postRef.key,
            userId: user.uid, // Add userId for security rules
            name: userdata.name || user.displayName || user.email || "Anonymous",
            role: userdata.role || "User",
            message: window.sharedComponents.sanitizeHTML(msg),
            imageURL: imageURL || null,
            timestamp: Date.now(),
            reaction: null,
            tagged: taggedUIDs
          });

          console.log("✅ Post created successfully");
          postForm.reset();
          
        } catch (error) {
          console.error("❌ Post submission failed:", error);
          const errorMessage = window.handleFirebaseError(error, "Post submission");
          alert("❌ " + errorMessage);
        } finally {
          // Reset button state
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Post";
          }
        }
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
      // Load users with proper error handling
      try {
        window.sharedComponents.showLoading(tbody, "Loading users...");
        const users = await listUsers();
        tbody.innerHTML = "";
        
        if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
        } else {
          users.forEach(u => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${window.sharedComponents.sanitizeHTML(u.uid || "-")}</td>
              <td>${window.sharedComponents.sanitizeHTML(u.email || "-")}</td>
              <td>${window.sharedComponents.sanitizeHTML(u.displayName || "-")}</td>
            `;
            addEditButtonToRow(row, u);
            tbody.appendChild(row);
          });
        }
        console.log("✅ User table loaded successfully");
      } catch (e) {
        console.error("❌ Failed to load users:", e);
        const errorMessage = window.handleFirebaseError(e, "User loading");
        tbody.innerHTML = `<tr><td colspan="4" class="error-message">❌ ${errorMessage}</td></tr>`;
      }

      // User creation form with enhanced error handling
      const form = document.getElementById("create-user-form");
      if (form) {
        form.addEventListener("submit", async e => {
          e.preventDefault();
          
          const submitButton = form.querySelector('button[type="submit"]');
          const emailInput = document.getElementById("new-email");
          const passwordInput = document.getElementById("new-password");
          const displayNameInput = document.getElementById("new-displayName");
          const adminCheckbox = document.getElementById("new-admin");
          
          try {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const displayName = displayNameInput.value.trim();
            const wantAdmin = adminCheckbox.checked;

            // Client-side validation
            if (!email) {
              throw new Error("Email is required.");
            }
            if (!password) {
              throw new Error("Password is required.");
            }

            // Show loading state
            if (submitButton) {
              submitButton.disabled = true;
              submitButton.textContent = "Creating User...";
            }

            const newUser = await createUser({ email, password, displayName, admin: wantAdmin });
            
            alert(`✅ Successfully created user: ${newUser.email || newUser.uid}`);
            form.reset();
            
            // Refresh user table
            try {
              window.sharedComponents.showLoading(tbody, "Refreshing users...");
              const users = await listUsers();
              tbody.innerHTML = "";
              users.forEach(u => {
                const r = document.createElement("tr");
                r.innerHTML = `
                  <td>${window.sharedComponents.sanitizeHTML(u.uid || "-")}</td>
                  <td>${window.sharedComponents.sanitizeHTML(u.email || "-")}</td>
                  <td>${window.sharedComponents.sanitizeHTML(u.displayName || "-")}</td>
                `;
                addEditButtonToRow(r, u);
                tbody.appendChild(r);
              });
            } catch (refreshError) {
              console.error("⚠️ Failed to refresh user table:", refreshError);
              // Don't show error to user as the user was created successfully
            }
            
          } catch (err) {
            console.error("❌ Create user failed:", err);
            alert("❌ " + err.message);
          } finally {
            // Reset button state
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "Create User";
            }
          }
        });
      }
    }
  });
});
