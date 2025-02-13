document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
  
    if (!user) {
      window.location.href = "../validations/login.html";
      return;
    }
  
    document.getElementById("userDetails").innerHTML = `
        <h2>Hello, ${user.username}</h2>
        <p>Email: ${user.email}</p>
        <p>Role: ${user.user_role.join(", ")}</p>
        <div id="dashboardContent"></div>
    `;
  
    const dashboardContent = document.getElementById("dashboardContent");
  
    if (user.user_role.includes("seller")) {
      
      const sellerPortalBtn = document.createElement("button");
      sellerPortalBtn.textContent = "Go Back to Seller Portal";
      sellerPortalBtn.classList.add("btn", "btn--primary");
      sellerPortalBtn.addEventListener("click", () => {
        window.location.href = "../seller/dashboard/sellerDashboard.html";
      });
      dashboardContent.appendChild(sellerPortalBtn);
    }
    if (user.user_role.includes("admin")) {
      dashboardContent.innerHTML += "<p>Welcome, Admin! Manage platform activities.</p>";
    }
  });
  
  function logout() {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "../validations/login.html";
  }
  