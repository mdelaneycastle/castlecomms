async function listUsers() {
  const auth = firebase.auth();

  // 1) force-refresh so the admin:true claim is in the token
  await auth.currentUser.getIdToken(true);

  // 2) get the Functions instance in europe-west1
  const functions = firebase.app().functions("europe-west1");
  const fn = functions.httpsCallable("listUsers");

  // 3) call it with an empty object (must POST)
  const res = await fn({});
  return res.data.users;    // array of { uid, email, displayName }
}

function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("close-btn");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => sidebar.classList.add("show");
  }
  if (closeBtn && sidebar) {
    closeBtn.onclick = () => sidebar.classList.remove("show");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const db = window.db;
  const postForm = document.getElementById("post-form");
  const feed = document.getElementById("feed");

  function submitPost(name, role, message) {
    const postRef = db.ref("posts").push();
    const postId = postRef.key;

    if (!postId) {
      console.error("Failed to generate post ID");
      return;
    }

    const post = {
      postId,
      name,
      role,
      message,
      timestamp: Date.now(),
      reaction: null
    };

    postRef.set(post).catch(error => console.error("Post save error:", error));
  }

  function displayPost(post) {
    const postId = post.postId || "undefined";

    const initials = post.name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const div = document.createElement("div");
    div.className = "post";
    div.dataset.id = postId;

    div.innerHTML = `
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
          <div class="emoji-picker hidden">
            <span>👏</span><span>❤️</span><span>💡</span><span>👍</span><span>🤔</span>
          </div>
        </div>
      </div>
      <div class="post-comments"></div>
      <form class="comment-form" data-postid="${postId}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Reply</button>
      </form>
    `;

    feed.prepend(div);

    const commentForm = div.querySelector(".comment-form");
    const commentInput = commentForm.querySelector("input");
    const commentsDiv = div.querySelector(".post-comments");

    // Listen for comments on this post only
    const commentsRef = db.ref(`posts/${postId}/comments`);
    commentsRef.on("child_added", snapshot => {
      const data = snapshot.val();
      const p = document.createElement("p");
      p.textContent = `${new Date(data.timestamp).toLocaleTimeString()}: ${data.text}`;
      commentsDiv.appendChild(p);
    });

    // Add new comment
    commentForm.addEventListener("submit", e => {
      e.preventDefault();
      const comment = commentInput.value.trim();
      if (!comment) return;

      db.ref(`posts/${postId}/comments`).push({
        text: comment,
        timestamp: Date.now()
      }).catch(error => console.error("Comment error:", error));

      commentInput.value = "";
    });

    setupReactions(div.querySelector(".react-btn"), div.querySelector(".emoji-picker"), postId);
  }

  function setupReactions(button, picker, postId) {
    button.addEventListener("click", () => {
      picker.classList.toggle("hidden");
    });

    picker.querySelectorAll("span").forEach(span => {
      span.addEventListener("click", () => {
        const selectedReaction = span.textContent;
        button.textContent = selectedReaction;
        picker.classList.add("hidden");

        db.ref(`posts/${postId}`).update({ reaction: selectedReaction })
          .catch(error => console.error("Reaction error:", error));
      });
    });
  }

  firebase.auth().onAuthStateChanged(async user => {
  if (!user) return window.location.href = "index.html";

  try {
    const users = await listUsers();
    // render your table with `users`
  } catch (e) {
    console.error(e);
    alert("❌ You do not have permission to view users.");
  }
});

  function listenForPosts() {
    const postsRef = db.ref("posts");
    postsRef.on("child_added", snapshot => {
      const post = snapshot.val();
      post.postId = post.postId || snapshot.key; // fallback if missing
      displayPost(post);
    });
  }

  if (postForm) {
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      const user = firebase.auth().currentUser;
      const uid = user.uid;

      db.ref(`users/${uid}`).once("value").then(snapshot => {
        const userData = snapshot.val();
        const name = userData?.name || user.displayName || user.email || "Anonymous";
        const role = userData?.role || "User";

        const message = document.getElementById("message").value.trim();
        if (!name || !message) return;

        submitPost(name, role, message);
        postForm.reset();
      }).catch(error => {
        console.error("Failed to fetch user data:", error);
      });
    });

    listenForPosts();
  }
});
