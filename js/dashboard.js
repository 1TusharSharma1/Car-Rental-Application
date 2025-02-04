document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("userDetails").innerHTML = `
        <h2>Hello, ${user.username}</h2>
        <p>Email: ${user.email}</p>
        <p>Role: ${user.user_role.join(", ")}</p>
    `;

    const dashboardContent = document.getElementById("dashboardContent");

    if (user.user_role.includes("buyer")) {
        dashboardContent.innerHTML = "<p>Welcome to Buyer Dashboard!</p>";
    } 
    if (user.user_role.includes("seller")) {
        dashboardContent.innerHTML = "<p>Welcome to Seller Dashboard! Manage your cars here.</p>";
    } 
    if (user.user_role.includes("admin")) {
        dashboardContent.innerHTML = "<p>Welcome, Admin! Manage platform activities.</p>";
    }
});

function logout() {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}
