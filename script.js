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
    const post = {
      postId: postRef.key,
      name,
      role,
      message,
      timestamp: Date.now(),
      reaction: null
    };
    postRef.set(post);
  }

  function displayPost(post) {
    const initials = post.name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const div = document.createElement("div");
    div.className = "post";
    div.dataset.id = post.postId;

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
      <div class="post-comments" id="comments-${post.postId}"></div>
      <form class="comment-form" data-postid="${post.postId}">
        <input type="text" placeholder="Write a comment..." required />
        <button type="submit">Reply</button>
      </form>
    `;

    feed.prepend(div);

    const postId = post.postId;
    const commentForm = div.querySelector(".comment-form");
    const commentInput = commentForm.querySelector("input");
    const commentsDiv = div.querySelector(`#comments-${postId}`);

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

  function listenForPosts() {
    const postsRef = db.ref("posts");
    postsRef.on("child_added", snapshot => {
      const post = snapshot.val();
      displayPost(post);
    });
  }

  if (postForm) {
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const message = document.getElementById("message").value.trim();
      if (!name || !message) return;

      submitPost(name, "User", message);
      postForm.reset();
    });

    listenForPosts();
  }
});
