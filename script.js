console.log("🔌 script.js initialized");

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

// ─── Sidebar toggle logic ───
function setupSidebarEvents() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn  = document.getElementById("close-btn");
  const sidebar   = document.getElementById("sidebar");
  if (toggleBtn && sidebar) toggleBtn.onclick = () => sidebar.classList.add("show");
  if (closeBtn  && sidebar) closeBtn.onclick  = () => sidebar.classList.remove("show");
}

// ─── DOM ready ───
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarEvents();

  // — Feed & posting logic (unchanged) —
  // … your window.db, postForm & feed code …

  // — Admin page logic —
  const tbody = document.querySelector("#user-table tbody");
  if (tbody) {
    firebase.auth().onAuthStateChanged(async user => {
      if (!user) return window.location.href = "index.html";

      // Populate existing users
      try {
        const users = await listUsers();
        tbody.innerHTML = "";
        users.forEach(u => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${u.uid}</td>
            <td>${u.email||"-"}</td>
            <td>${u.displayName||"-"}</td>
          `;
          tbody.appendChild(row);
        });
      } catch (e) {
        console.error(e);
        alert("❌ You do not have permission to view users.");
      }

      // Wire up "Create User" form
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

            // Refresh the list
            tbody.innerHTML = "";
            const users = await listUsers();
            users.forEach(u => {
              const row = document.createElement("tr");
              row.innerHTML = `<td>${u.uid}</td><td>${u.email||"-"}</td><td>${u.displayName||"-"}</td>`;
              tbody.appendChild(row);
            });
          } catch (err) {
            console.error("Create user failed:", err);
            alert("❌ " + err.message);
          }
        });
      }
    });
  }
});
