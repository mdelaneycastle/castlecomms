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
          <button class="react-btn">➕ React</button>
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

  // Reaction button logic
  function setupReactions(button, picker) {
    button.addEventListener("click", () => {
      picker.classList.toggle("hidden");
    });

    picker.querySelectorAll("span").forEach(span => {
      span.addEventListener("click", () => {
        button.textContent = span.textContent;
        picker.classList.add("hidden");
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
