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
          <button class="comment-toggle" data-index="${index}">💬 Comment</button>
          <div class="comment-section hidden" data-index="${index}">
            <div class="comment-list"></div>
            <form class="comment-form">
              <input type="text" placeholder="Your name" required />
              <textarea placeholder="Add a comment..." required></textarea>
              <button type="submit">Post Comment</button>
            </form>
          </div>
        </div>
      `;

      feed.appendChild(div);
    });

    setupReactions();
    setupCommentInteractions();
  }

  function setupReactions() {
    document.querySelectorAll(".react-btn").forEach(btn => {
      btn.addEventListener("click", () => {
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

  function setupCommentInteractions() {
    document.querySelectorAll(".comment-toggle").forEach(button => {
      button.addEventListener("click", () => {
        const index = button.dataset.index;
        const section = document.querySelector(`.comment-section[data-index="${index}"]`);
        section.classList.toggle("hidden");
        loadComments(index);
      });
    });

    document.querySelectorAll(".comment-form").forEach((form, idx) => {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const nameInput = form.querySelector("input");
        const textInput = form.querySelector("textarea");
        const name = nameInput.value.trim();
        const message = textInput.value.trim();
        if (!name || !message) return;

        addComment(idx, name, message);
        nameInput.value = "";
        textInput.value = "";
        loadComments(idx);
      });
    });
  }

  function loadComments(index) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    const post = posts[posts.length - 1 - index];
    const commentList = document.querySelector(`.comment-section[data-index="${index}"] .comment-list`);

    commentList.innerHTML = "";

    const comments = (post.comments || []).slice().reverse(); // Newest first
    comments.forEach(comment => {
      const initials = comment.name
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const bubble = document.createElement("div");
      bubble.className = "comment-bubble";
      bubble.innerHTML = `
        <div class="comment-avatar">${initials}</div>
        <div class="comment-content">
          <div class="comment-name">${comment.name}</div>
          <div class="comment-text">${comment.message}</div>
        </div>
      `;
      commentList.appendChild(bubble);
    });
  }

  function addComment(index, name, message) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    const post = posts[posts.length - 1 - index];

    if (!post.comments) post.comments = [];
    post.comments.push({ name, message });

    localStorage.setItem("posts", JSON.stringify(posts));
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
