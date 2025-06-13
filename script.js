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
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<h3>${post.name}</h3><p>${post.message}</p>`;
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
