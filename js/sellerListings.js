document.addEventListener("DOMContentLoaded", () => {
  const addCarBtn = document.getElementById("addCarBtn");
  const addCarModal = document.getElementById("addCarModal");
  const addCarForm = document.getElementById("addCarForm");
  const closeBtn = document.querySelector(".close-btn");

  const superCategorySelect = document.getElementById("superCategory");
  const categorySelect = document.getElementById("category");
  const otherCategoryWrapper = document.getElementById("otherCategoryWrapper");
  const otherCategoryInput = document.getElementById("otherCategoryInput");

  const otherSuperCategoryWrapper = document.getElementById("otherSuperCategoryWrapper");
  const otherSuperCategoryInput = document.getElementById("otherSuperCategoryInput");

  addCarBtn.addEventListener("click", () => {
    addCarModal.style.display = "flex";
    loadSuperCategories();
  });

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === addCarModal) {
      closeModal();
    }
  });

  loadSellerListings();

  function closeModal() {
    addCarModal.style.display = "none";
    addCarForm.reset();
    otherSuperCategoryWrapper.style.display = "none";
    otherCategoryWrapper.style.display = "none";
  }

  function loadSuperCategories() {
    if (!superCategorySelect) {
      console.error("superCategorySelect not found in DOM.");
      return;
    }
    openDB(() => {
      const transaction = db.transaction(["superCategories"], "readonly");
      const store = transaction.objectStore("superCategories");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const superCategories = event.target.result;
        superCategorySelect.innerHTML = `<option value="">Select Super Category</option>`;
        superCategories.forEach((category) => {
          superCategorySelect.innerHTML += `<option value="${category.supercategory_id}">${category.superCategory_name}</option>`;
        });
        superCategorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  superCategorySelect.addEventListener("change", () => {
    categorySelect.innerHTML = `<option value="">Select Category</option>`;
    if (superCategorySelect.value === "Other") {
      otherSuperCategoryWrapper.style.display = "block";
      otherCategoryWrapper.style.display = "block";
      categorySelect.innerHTML = `<option value="Other">Enter Your Category</option>`;
    } else {
      otherSuperCategoryWrapper.style.display = "none";
      loadCategories(superCategorySelect.value);
    }
  });

  function loadCategories(supercategory_id) {
    if (!categorySelect) {
      console.error("categorySelect not found in DOM.");
      return;
    }
    openDB(() => {
      const transaction = db.transaction(["categories"], "readonly");
      const store = transaction.objectStore("categories");
      const index = store.index("supercategory_id");
      const request = index.getAll(supercategory_id);
      request.onsuccess = (event) => {
        const categories = event.target.result;
        categorySelect.innerHTML = `<option value="">Select Category</option>`;
        categories.forEach((category) => {
          categorySelect.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
        });
        categorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  categorySelect.addEventListener("change", () => {
    if (categorySelect.value === "Other") {
      otherCategoryWrapper.style.display = "block";
    } else {
      otherCategoryWrapper.style.display = "none";
    }
  });

  addCarForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let newCategory = otherCategoryInput.value.trim();
    let supercategoryId = superCategorySelect.value;
    let categoryId = categorySelect.value;
    let vehicleOwner = JSON.parse(sessionStorage.getItem("loggedInUser"));

    if (supercategoryId === "Other") {
      supercategoryId = await saveNewSuperCategory(otherSuperCategoryInput.value.trim());
    }
    if (categoryId === "Other" && newCategory.length > 0) {
      categoryId = await saveNewCategory(newCategory, supercategoryId);
    }

    saveImages().then((imageURLs) => {
      saveVehicle({
        vehicle_id: crypto.randomUUID(),
        vehicle_owner_id: vehicleOwner.user_id,
        vehicle_owner_name: vehicleOwner.username,
        vehicle_model: document.getElementById("vehicleModel").value.trim(),
        minimum_rental_price: Number(document.getElementById("minPrice").value),
        availability: document.getElementById("availability").value,
        location: document.getElementById("location").value.trim(),
        features: document.getElementById("features").value.trim(),
        images_URL: imageURLs,
        uploaded_at: new Date().toISOString(),
        category_id: categoryId,
        supercategory_id: supercategoryId,
      });
      alert("✅ Vehicle added successfully!");
      closeModal();
    });
  });

  function saveNewSuperCategory(superCategoryName) {
    return new Promise((resolve) => {
      const supercategoryId = crypto.randomUUID();
      openDB(() => {
        const transaction = db.transaction(["superCategories"], "readwrite");
        const store = transaction.objectStore("superCategories");
        const request = store.add({
          supercategory_id: supercategoryId,
          superCategory_name: superCategoryName,
        });
        request.onsuccess = () => resolve(supercategoryId);
      });
    });
  }

  function saveNewCategory(categoryName, supercategory_id) {
    return new Promise((resolve) => {
      const categoryId = crypto.randomUUID();
      openDB(() => {
        const transaction = db.transaction(["categories"], "readwrite");
        const store = transaction.objectStore("categories");
        const newCategory = {
          category_id: categoryId,
          category_name: categoryName,
          supercategory_id: supercategory_id,
        };
        const request = store.add(newCategory);
        request.onsuccess = () => {
          alert(`✅ New category "${categoryName}" added successfully!`);
          resolve(categoryId);
        };
      });
    });
  }

  function saveVehicle(vehicleData) {
    openDB(() => {
      const transaction = db.transaction(["vehicles"], "readwrite");
      const store = transaction.objectStore("vehicles");
      store.add(vehicleData);
    });
  }

  function saveImages() {
    const files = document.getElementById("imageUpload").files;
    let imageArray = [];
    let fileReaders = [];
    return new Promise((resolve) => {
      for (let file of files) {
        const reader = new FileReader();
        fileReaders.push(
          new Promise((res) => {
            reader.readAsDataURL(file);
            reader.onload = function (event) {
              imageArray.push(event.target.result);
              res();
            };
          })
        );
      }
      Promise.all(fileReaders).then(() => {
        resolve(JSON.stringify(imageArray));
      });
    });
  }

  function loadSellerListings() {
    const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!seller) {
      alert(" Please log in first.");
      window.location.href = "login.html";
      return;
    }
    openDB(() => {
      const transaction = db.transaction(["vehicles"], "readonly");
      const store = transaction.objectStore("vehicles");
      const index = store.index("vehicle_owner_id");
      const request = index.getAll(seller.user_id);
      request.onsuccess = (event) => {
        const listings = event.target.result;
        displayListings(listings);
      };
    });
  }

  function displayListings(listings) {
    const carContainer = document.getElementById("carContainer");
    carContainer.innerHTML = "";
    if (listings.length === 0) {
      carContainer.innerHTML = "<p>No listings found. Add a new car to start renting!</p>";
      return;
    }
    listings.forEach((vehicle) => {
      const carCard = document.createElement("div");
      carCard.classList.add("car-card");
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
      const transaction = db.transaction(["vehicles"], "readwrite");
      const store = transaction.objectStore("vehicles");
      store.delete(vehicleId);
      transaction.oncomplete = () => {
        alert("Listing deleted successfully!");
        loadSellerListings();
      };
      transaction.onerror = (event) => {
        console.error("Error deleting listing:", event.target.error);
        alert("Could not delete listing. Try again.");
      };
    });
  }
  window.deleteListing = deleteListing;

  if (db && !db.objectStoreNames.contains("vehicles")) {
    db.createObjectStore("vehicles", { keyPath: "vehicle_id" }).createIndex(
      "vehicle_owner_id",
      "vehicle_owner_id",
      { unique: false }
    );
  }
});
