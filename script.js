document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const closeButton = document.getElementById("close-btn");

  if (toggleButton && sidebar && closeButton) {
    toggleButton.addEventListener("click", () => sidebar.classList.add("show"));
    closeButton.addEventListener("click", () => sidebar.classList.remove("show"));
  }

  const postForm = document.getElementById("post-form");
  const feed = document.getElementById("feed");

  // Submit post to Firebase
  function submitPost(name, role, message) {
    const post = { name, role, message, timestamp: Date.now() };
    db.ref("posts").push(post);
  }

  // Display a single post on the page
  function displayPost(post) {
    const initials = post.name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const div = document.createElement("div");
    div.className = "post";

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
    `;

    feed.prepend(div);
    setupReactions(div.querySelector(".react-btn"), div.querySelector(".emoji-picker"));
  }

  // Listen for new posts in Firebase
  function listenForPosts() {
    const postsRef = db.ref("posts");

    postsRef.on("child_added", (snapshot) => {
      const post = snapshot.val();
      displayPost(post);
    });
  }

  function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("close-btn");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => sidebar.style.display = "block";
  }
  if (closeBtn && sidebar) {
    closeBtn.onclick = () => sidebar.style.display = "none";
  }
}

  // Reaction button logic
  function setupReactions(button, picker) {
    button.addEventListener("click", () => {
      picker.classList.toggle("hidden");
    });

    picker.querySelectorAll("span").forEach(span => {
  span.addEventListener("click", () => {
    const selectedReaction = span.textContent;
    button.textContent = selectedReaction;
    picker.classList.add("hidden");

    // Find this post's timestamp to identify it in Firebase
    const timestampEl = button.closest(".post").querySelector(".post-time");
    const postTime = new Date(timestampEl.textContent).getTime();

    // Find and update the post in Firebase by timestamp
    db.ref("posts").once("value", snapshot => {
      snapshot.forEach(child => {
        const post = child.val();
        if (post.timestamp === postTime) {
          db.ref("posts/" + child.key).update({ reaction: selectedReaction });
        }
      });
    });
  });
});
  }

  // Form submission
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
