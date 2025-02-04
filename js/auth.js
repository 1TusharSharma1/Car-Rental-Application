document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const buyerForm = document.getElementById("buyer-signup-form");
    const sellerForm = document.getElementById("seller-signup-form");
    const goToLogin = document.getElementById("goToLogin");
    const goToSignUp = document.getElementById("goToSignUp");

    if (loginForm) loginForm.addEventListener("submit", loginUser);
    if (buyerForm) buyerForm.addEventListener("submit", signUpBuyer);
    if (sellerForm) sellerForm.addEventListener("submit", signUpSeller);
    
    if (goToLogin) goToLogin.addEventListener("click", () => toggleForms("login"));
    if (goToSignUp) goToSignUp.addEventListener("click", () => toggleForms("signup"));
});

function toggleForms(formType) {
    const buyerForm = document.getElementById("buyer-signup-form");
    const loginForm = document.getElementById("login-form");

    if (!buyerForm || !loginForm) {
        console.error("Forms not found in the DOM!");
        return;
    }

    if (formType === "signup") {
        buyerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
    } else if (formType === "login") {
        buyerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    }
}


function hashPassword(password) {
    return CryptoJS.SHA256(password).toString(); 
}

function signUpBuyer(event) {
    event.preventDefault();

    const email = document.getElementById("signUpEmail").value.trim();
    const username = document.getElementById("signUpUsername").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const confirmPassword = document.getElementById("confirmedSignUpPassword").value;

    const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        alert("   Invalid email format! Example: user@example.com");
        return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        alert("   Username must be 3-20 characters long and can contain letters, numbers, and underscores.");
        return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
        alert("   Password must be at least 6 characters, include 1 uppercase letter, 1 number, and 1 special character.");
        return;
    }

    if (password !== confirmPassword) {
        alert("   Passwords do not match!");
        return;
    }

    openDB(() => {
        const transaction = db.transaction(["users"], "readwrite");
        const usersStore = transaction.objectStore("users");

        usersStore.index("email").get(email).onsuccess = (event) => {
            if (event.target.result) {
                alert("   Email already registered!");
                return;
            } 

            const userId = crypto.randomUUID();
            const newUser = {
                user_id: userId,
                email: email,
                username: username,
                password: hashPassword(password), 
                photoURL: "https://photosking.net/wp-content/uploads/2024/05/no-dp-pic_23.webp",
                user_role: ["buyer"],
                created_at: new Date().toISOString(),
                address_id: null,
            };

            const addRequest = usersStore.add(newUser);

            addRequest.onsuccess = () => {
                alert("   Signup successful! Please log in.");
                toggleForms("login");
            };

            addRequest.onerror = (event) => {
                console.error("   Error adding user:", event.target.error);
                alert("    Error signing up! Please try again.");
            };
        };

        transaction.onerror = (event) => {
            console.error("   Transaction failed:", event.target.error);
            alert("    Database transaction error. Please refresh and try again.");
        };
    });
}

function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;


    openDB(() => {

        const transaction = db.transaction(["users"], "readonly");
        const store = transaction.objectStore("users");
        const index = store.index("email");

        const request = index.get(email);

        request.onsuccess = (event) => {
            const user = event.target.result;



            if (!user) {
                alert(" User not found! Please sign up first.");
                return;
            }


            if (user.password !== hashPassword(password)) {
                alert(" Incorrect password!");
                return;
            }


            sessionStorage.setItem("loggedInUser", JSON.stringify(user));

            if (user.user_role.includes("admin")) {
                window.location.href = "adminDashboard.html";
            } else if (user.user_role.includes("seller")) {
                window.location.href = "sellerDashboard.html";
            } else if (user.user_role.includes("buyer")) {
                window.location.href = "buyerHomepage.html";
            } else {
                alert(" Role not recognized. Contact support.");
            }
            
        };

        request.onerror = (event) => {
            console.error("Error fetching user:", event.target.error);
        };
    });
}


function signUpSeller(event) {
    event.preventDefault();

    const email = document.getElementById("sellerEmail").value.trim();
    const businessName = document.getElementById("businessName").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const confirmPassword = document.getElementById("confirmedSignUpPassword").value;

    const line1 = document.getElementById("line1").value.trim();
    const line2 = document.getElementById("line2").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const pincode = document.getElementById("pincode").value.trim();

    if (!email || !businessName || !password || !confirmPassword || !line1 || !city || !state || !pincode) {
        alert(" All fields are required!");
        return;
    }

    const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        alert("   Invalid email format! Example: user@example.com");
        return;
    }

    if (businessName.length < 3) {
        alert("   Business name must be at least 3 characters long.");
        return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
        alert("   Password must be at least 6 characters, include 1 uppercase letter, 1 number, and 1 special character.");
        return;
    }

    if (password !== confirmPassword) {
        alert("   Passwords do not match!");
        return;
    }

    

    openDB(() => {
        const transaction = db.transaction(["users", "addresses"], "readwrite");
        const usersStore = transaction.objectStore("users");
        const addressesStore = transaction.objectStore("addresses");

        usersStore.index("email").get(email).onsuccess = (event) => {
            let user = event.target.result;

            if (user) {
                if (user.user_role.includes("seller")) {
                    alert("You are already registered as a seller.");
                    return;
                }

                user.user_role.push("seller");
                const addressId = crypto.randomUUID();

                const addressData = {
                    address_id: addressId,
                    line_1: line1,
                    line_2: line2,
                    city: city,
                    state: state,
                    pincode: Number(pincode),
                    latitude: null,
                    longitude: null
                };

                addressesStore.add(addressData);
                user.address_id = addressId;
                usersStore.put(user);

                alert(" Seller role added to your profile!");
                window.location.href = "sellerDashboard.html";
            } else {
                const userId = crypto.randomUUID();
                const addressId = crypto.randomUUID();

                const newUser = {
                    user_id: userId,
                    email: email,
                    username: businessName,
                    password: hashPassword(password),
                    photoURL: "https://photosking.net/wp-content/uploads/2024/05/no-dp-pic_23.webp",
                    user_role: ["buyer","seller"], 
                    created_at: new Date().toISOString(),
                    address_id: addressId
                };

                const addressData = {
                    address_id: addressId,
                    line_1: line1,
                    line_2: line2,
                    city: city,
                    state: state,
                    pincode: Number(pincode),
                    latitude: null,
                    longitude: null
                };

                addressesStore.add(addressData);
                usersStore.add(newUser);

                alert(" Seller registration successful! Please login.");
                window.location.href = "login.html";
            }
        };

        transaction.onerror = (event) => {
            console.error(" Transaction failed:", event.target.error);
        };
    });
}
