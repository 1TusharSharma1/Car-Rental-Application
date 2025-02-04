document.addEventListener("DOMContentLoaded", () => {
    loadAnalytics();
    loadUsers();
  });
  
  function loadAnalytics() {
    loadTotalUsers();
    loadTotalVehicles();
    loadTotalBookings();
    loadTotalBids();
    loadTotalMessages();
  }
  
  function loadTotalUsers() {
    openDB(() => {
      if (!db.objectStoreNames.contains("users")) {
        console.error("Users store not found.");
        return;
      }
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const users = event.target.result;
        document.getElementById("totalUsers").innerText = `Total Users: ${users.length}`;
      };
      request.onerror = (event) => {
        console.error("Error fetching users:", event.target.error);
      };
    });
  }
  
  function loadTotalVehicles() {
    openDB(() => {
      if (!db.objectStoreNames.contains("vehicles")) {
        console.error("Vehicles store not found.");
        return;
      }
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const vehicles = event.target.result;
        document.getElementById("totalVehicles").innerText = `Total Vehicles: ${vehicles.length}`;
      };
      request.onerror = (event) => {
        console.error("Error fetching vehicles:", event.target.error);
      };
    });
  }
  
  function loadTotalBookings() {
    openDB(() => {
      if (!db.objectStoreNames.contains("bookings")) {
        console.error("Bookings store not found.");
        return;
      }
      const tx = db.transaction(["bookings"], "readonly");
      const store = tx.objectStore("bookings");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const bookings = event.target.result;
        document.getElementById("totalBookings").innerText = `Total Bookings: ${bookings.length}`;
      };
      request.onerror = (event) => {
        console.error("Error fetching bookings:", event.target.error);
      };
    });
  }
  
  function loadTotalBids() {
    openDB(() => {
      if (!db.objectStoreNames.contains("bidding")) {
        console.error("Bidding store not found.");
        return;
      }
      const tx = db.transaction(["bidding"], "readonly");
      const store = tx.objectStore("bidding");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const bids = event.target.result;
        document.getElementById("totalBids").innerText = `Total Bids: ${bids.length}`;
      };
      request.onerror = (event) => {
        console.error("Error fetching bids:", event.target.error);
      };
    });
  }
  
  function loadTotalMessages() {
    openDB(() => {
      if (!db.objectStoreNames.contains("messages")) {
        console.error("Messages store not found.");
        return;
      }
      const tx = db.transaction(["messages"], "readonly");
      const store = tx.objectStore("messages");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const messages = event.target.result;
        document.getElementById("totalMessages").innerText = `Total Messages: ${messages.length}`;
      };
      request.onerror = (event) => {
        console.error("Error fetching messages:", event.target.error);
      };
    });
  }
  
  function loadUsers() {
    openDB(() => {
      if (!db.objectStoreNames.contains("users")) {
        console.error("Users store not found.");
        return;
      }
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const users = event.target.result;
        displayUsers(users);
      };
      request.onerror = (event) => {
        console.error("Error fetching users:", event.target.error);
      };
    });
  }
  
  function displayUsers(users) {
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";
    if (!users || users.length === 0) {
      tbody.innerHTML = "<tr><td colspan='5'>No users found.</td></tr>";
      return;
    }
    users.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.user_id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${Array.isArray(user.user_role) ? user.user_role.join(", ") : user.user_role}</td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  function logout() {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  }
  