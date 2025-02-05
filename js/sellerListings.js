document.addEventListener("DOMContentLoaded", () => {
  const addCarBtn = document.getElementById("addCarBtn");
  const addCarModal = document.getElementById("addCarModal");
  const addCarForm = document.getElementById("addCarForm");
  const closeBtn = document.querySelector(".close-btn");

  const superCategorySelect = document.getElementById("superCategory");
  const categorySelect = document.getElementById("category");

  const categoryRow = document.getElementById("categoryRow"); // The row hidden by default

  const otherCategoryWrapper = document.getElementById("otherCategoryWrapper");
  const otherCategoryInput = document.getElementById("otherCategoryInput");

  const otherSuperCategoryWrapper = document.getElementById("otherSuperCategoryWrapper");
  const otherSuperCategoryInput = document.getElementById("otherSuperCategoryInput");

  // 1) Open modal on button click
  addCarBtn.addEventListener("click", () => {
    addCarModal.style.display = "flex";
    loadSuperCategories();
  });

  // 2) Close modal
  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === addCarModal) {
      closeModal();
    }
  });

  // 3) Hide category row initially
  if (categoryRow) {
    categoryRow.style.display = "none";
  }

  // 4) Load existing listings
  loadSellerListings();

  function closeModal() {
    addCarModal.style.display = "none";
    addCarForm.reset();
    otherSuperCategoryWrapper.style.display = "none";
    otherCategoryWrapper.style.display = "none";

    // Re-hide category row so user picks superCategory again next time
    if (categoryRow) {
      categoryRow.style.display = "none";
    }
  }

  function loadSuperCategories() {
    if (!superCategorySelect) return;
    openDB(() => {
      const tx = db.transaction(["superCategories"], "readonly");
      const store = tx.objectStore("superCategories");
      const req = store.getAll();
      req.onsuccess = (event) => {
        const superCats = event.target.result;
        superCategorySelect.innerHTML = `<option value="">Select Super Category</option>`;
        superCats.forEach((sc) => {
          superCategorySelect.innerHTML += `<option value="${sc.supercategory_id}">${sc.superCategory_name}</option>`;
        });
        superCategorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  // Show/hide category row & "other" fields based on superCategory
  superCategorySelect.addEventListener("change", () => {
    // If user picks a superCategory (non-empty), show the category row
    if (superCategorySelect.value) {
      if (categoryRow) categoryRow.style.display = "block";
    } else {
      // If blank, hide it
      if (categoryRow) categoryRow.style.display = "none";
    }

    // Clear category options
    categorySelect.innerHTML = `<option value="">Select Category</option>`;

    if (superCategorySelect.value === "Other") {
      otherSuperCategoryWrapper.style.display = "block";
      otherCategoryWrapper.style.display = "block";
      // Category select forced to "Other"
      categorySelect.innerHTML = `<option value="Other">Enter Your Category</option>`;
    } else {
      otherSuperCategoryWrapper.style.display = "none";
      // Load categories from DB
      loadCategories(superCategorySelect.value);
    }
  });

  function loadCategories(supercategory_id) {
    if (!categorySelect) return;
    openDB(() => {
      const tx = db.transaction(["categories"], "readonly");
      const store = tx.objectStore("categories");
      const index = store.index("supercategory_id");
      index.getAll(supercategory_id).onsuccess = (event) => {
        const cats = event.target.result;
        categorySelect.innerHTML = `<option value="">Select Category</option>`;
        cats.forEach((cat) => {
          categorySelect.innerHTML += `<option value="${cat.category_id}">${cat.category_name}</option>`;
        });
        categorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  // If user picks "Other" in Category, show the text input
  categorySelect.addEventListener("change", () => {
    if (categorySelect.value === "Other") {
      otherCategoryWrapper.style.display = "block";
    } else {
      otherCategoryWrapper.style.display = "none";
    }
  });

  // 5) Handle form submit
  addCarForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newCategory = otherCategoryInput.value.trim();
    let supercategoryId = superCategorySelect.value;
    let categoryId = categorySelect.value;

    const vehicleOwner = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!vehicleOwner) {
      alert("Please log in first.");
      return;
    }

    // If "Other" superCategory, create new superCategory in DB
    if (supercategoryId === "Other") {
      supercategoryId = await saveNewSuperCategory(otherSuperCategoryInput.value.trim());
    }
    // If "Other" category & user typed a new category
    if (categoryId === "Other" && newCategory.length > 0) {
      categoryId = await saveNewCategory(newCategory, supercategoryId);
    }

    // Save images (multiple)
    saveImages().then((imageURLs) => {
      // Build vehicle record
      const vehicleData = {
        vehicle_id: crypto.randomUUID(),
        vehicle_owner_id: vehicleOwner.user_id,
        vehicle_owner_name: vehicleOwner.username,
        vehicle_model: document.getElementById("vehicleModel").value.trim(),
        minimum_rental_price: Number(document.getElementById("minPrice").value),
        availability: "Available", // always "Available"
        location: document.getElementById("location").value.trim(),
        features: document.getElementById("features").value.trim(),
        images_URL: imageURLs, // store as JSON array of base64
        uploaded_at: new Date().toISOString(),
        category_id: categoryId,
        supercategory_id: supercategoryId
      };

      saveVehicle(vehicleData);
      alert("✅ Vehicle added successfully!");
      closeModal();
    });
  });

  function saveNewSuperCategory(name) {
    return new Promise((resolve) => {
      const supercategoryId = crypto.randomUUID();
      openDB(() => {
        const tx = db.transaction(["superCategories"], "readwrite");
        const store = tx.objectStore("superCategories");
        store.add({ supercategory_id: supercategoryId, superCategory_name: name }).onsuccess = () => {
          resolve(supercategoryId);
        };
      });
    });
  }

  function saveNewCategory(catName, superCatId) {
    return new Promise((resolve) => {
      const categoryId = crypto.randomUUID();
      openDB(() => {
        const tx = db.transaction(["categories"], "readwrite");
        const store = tx.objectStore("categories");
        store.add({ category_id: categoryId, category_name: catName, supercategory_id: superCatId }).onsuccess = () => {
          alert(`✅ New category "${catName}" added successfully!`);
          resolve(categoryId);
        };
      });
    });
  }

  function saveVehicle(vehicleData) {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readwrite");
      const store = tx.objectStore("vehicles");
      store.add(vehicleData);
    });
  }

  function saveImages() {
    const files = document.getElementById("imageUpload").files;
    let imageArray = [];
  
    // If no files are selected, resolve with an empty array
    if (!files || files.length === 0) {
      return Promise.resolve(JSON.stringify([]));
    }
  
    // Create a promise for each file
    let promises = [];
    for (let i = 0; i < files.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
          imageArray.push(event.target.result);
          resolve();
        };
        reader.onerror = function(err) {
          reject(err);
        };
        reader.readAsDataURL(files[i]);
      }));
    }
  
    // Once all file promises have resolved, return the JSON string of the image array
    return Promise.all(promises).then(() => JSON.stringify(imageArray));
  }
  

  // 6) Load listings
  function loadSellerListings() {
    const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!seller) {
      alert("Please log in first.");
      window.location.href = "login.html";
      return;
    }
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const index = store.index("vehicle_owner_id");
      index.getAll(seller.user_id).onsuccess = (event) => {
        const listings = event.target.result;
        displayListings(listings);
      };
    });
  }

  function displayListings(listings) {
    const carContainer = document.getElementById("carContainer");
    carContainer.innerHTML = "";
    if (!listings || listings.length === 0) {
      carContainer.innerHTML = "<p>No listings found. Add a new car to start renting!</p>";
      return;
    }
    listings.forEach((vehicle) => {
      const carCard = document.createElement("div");
      carCard.classList.add("car-card");

      // images_URL is a JSON array
      let images = JSON.parse(vehicle.images_URL);
      let imageSrc = (images && images.length > 0)
        ? images[0]
        : "https://via.placeholder.com/250";

      carCard.innerHTML = `
        <img src="${imageSrc}" alt="Car Image">
        <h3>${vehicle.vehicle_model}</h3>
        <p>Price: Rs ${vehicle.minimum_rental_price} /day</p>
        <p>Location: ${vehicle.location}</p>
        <p>Availability: <strong>${vehicle.availability}</strong></p>
        <button class="btn btn--danger" onclick="deleteListing('${vehicle.vehicle_id}')">Delete</button>
      `;
      carContainer.appendChild(carCard);
    });
  }

  function deleteListing(vehicleId) {
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readwrite");
      const store = tx.objectStore("vehicles");
      store.delete(vehicleId);
      tx.oncomplete = () => {
        alert("Listing deleted successfully!");
        loadSellerListings();
      };
      tx.onerror = (err) => {
        console.error("Error deleting listing:", err);
        alert("Could not delete listing. Try again.");
      };
    });
  }
  window.deleteListing = deleteListing;

  // If needed: create "vehicles" store if not in db.js
  if (db && !db.objectStoreNames.contains("vehicles")) {
    db.createObjectStore("vehicles", { keyPath: "vehicle_id" })
      .createIndex("vehicle_owner_id", "vehicle_owner_id", { unique: false });
  }
});
