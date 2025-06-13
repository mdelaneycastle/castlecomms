document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle
  const toggleButton = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const closeButton = document.getElementById("close-btn");

  if (toggleButton && sidebar && closeButton) {
    toggleButton.addEventListener("click", () => {
      sidebar.classList.add("show");
    });
    closeButton.addEventListener("click", () => {
      sidebar.classList.remove("show");
    });
  }

  // Newsfeed logic
  const postForm = document.getElementById("post-form");
  const feed = document.getElementById("feed");

  function loadPosts() {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    feed.innerHTML = "";
    posts.reverse().forEach(post => {
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
            <div class="post-role">User</div>
            <div class="post-time">Just now</div>
          </div>
        </div>
        <div class="post-message">${post.message}</div>
        <div class="post-footer">
          <span>❤️ 0</span>
          <span>💬 0 comments</span>
        </div>
      `;
      feed.appendChild(div);
    });
  }

  if (postForm) {
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const message = document.getElementById("message").value.trim();
      if (!name || !message) return;

      const posts = JSON.parse(localStorage.getItem("posts") || "[]");
      posts.push({ name, message });
      localStorage.setItem("posts", JSON.stringify(posts));

      postForm.reset();
      loadPosts();
    });

    loadPosts();
  }
});
