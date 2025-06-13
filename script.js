document.addEventListener("DOMContentLoaded", function () {
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

  const postForm = document.getElementById("post-form");
  const feed = document.getElementById("feed");

  function loadPosts() {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    feed.innerHTML = "";
    posts.reverse().forEach((post, index) => {
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
          <div>
            <button class="react-btn" data-index="${index}">
              ${post.reaction ? post.reaction : "➕ React"}
            </button>
            <div class="emoji-picker hidden" data-index="${index}">
              <span>👏</span><span>❤️</span><span>💡</span><span>👍</span><span>🤔</span>
            </div>
          </div>
          <span>💬 0 comments</span>
        </div>
      `;

      feed.appendChild(div);
    });

    document.querySelectorAll(".react-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = btn.dataset.index;
        const picker = document.querySelector(`.emoji-picker[data-index="${index}"]`);
        picker.classList.toggle("hidden");
      });
    });

    document.querySelectorAll(".emoji-picker span").forEach(span => {
      span.addEventListener("click", (e) => {
        const index = e.target.parentElement.dataset.index;
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        posts[posts.length - 1 - index].reaction = e.target.textContent;
        localStorage.setItem("posts", JSON.stringify(posts));
        loadPosts();
      });
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
