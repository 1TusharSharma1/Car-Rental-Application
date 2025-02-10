document.addEventListener("DOMContentLoaded", () => {

  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!currentUser) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }
  loadConversations();

  document.getElementById("backBtn").addEventListener("click", () => {
    window.history.go(-2);
  });
});

function loadConversations() {
  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  openDB(() => {
    if (!db.objectStoreNames.contains("conversations")) {
      console.error("Conversations store not found.");
      return;
    }
    const tx = db.transaction(["conversations"], "readonly");
    const store = tx.objectStore("conversations");
    const senderIndex = store.index("sender_id");
    const receiverIndex = store.index("receiver_id");
    const senderPromise = new Promise((resolve, reject) => {
      const reqSender = senderIndex.getAll(IDBKeyRange.only(currentUser.user_id));
      reqSender.onsuccess = (event) => resolve(event.target.result);
      reqSender.onerror = (event) => reject(event.target.error);
    });

    const receiverPromise = new Promise((resolve, reject) => {
      const reqReceiver = receiverIndex.getAll(IDBKeyRange.only(currentUser.user_id));
      reqReceiver.onsuccess = (event) => resolve(event.target.result);
      reqReceiver.onerror = (event) => reject(event.target.error);
    });

    Promise.all([senderPromise, receiverPromise])
      .then((results) => {
        const convs = [...results[0], ...results[1]];
        const convMap = {};
        convs.forEach(conv => {
          convMap[conv.conversation_id] = conv;
        });
        const uniqueConvs = Object.values(convMap);
        displayConversations(uniqueConvs);
      })
      .catch((error) => {
        console.error("Error fetching conversations:", error);
      });
  });
}

function displayConversations(conversationList) {
  const listContainer = document.getElementById("conversationList");
  listContainer.innerHTML = "";

  if (!conversationList || conversationList.length === 0) {
    listContainer.innerHTML = "<p>No conversations found.</p>";
    return;
  }

  conversationList.forEach(conv => {
    const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const otherPartyId = (conv.sender_id === currentUser.user_id)
      ? conv.receiver_id
      : conv.sender_id;

    Promise.all([
      getVehicleDetails(conv.vehicle_id),
      getUserDetails(otherPartyId)
    ])
      .then(([vehicle, otherUser]) => {
        const vehicleName = vehicle ? vehicle.vehicle_model : conv.vehicle_id;
        const otherUserName = otherUser ? otherUser.username : otherPartyId;

        const convItem = document.createElement("div");
        convItem.classList.add("conversation-item");
        convItem.innerHTML = `
          <div class="conversation-title">${vehicleName}</div>
          <div class="conversation-details">
            Chat with: ${otherUserName}<br>
            ${conv.isUnread ? `<span class="unread-indicator">New</span>` : ""}
          </div>
        `;
        convItem.addEventListener("click", () => {
          markConversationAsRead(conv.conversation_id);
          openChat(conv.conversation_id);
        });
        listContainer.appendChild(convItem);
      })
      .catch(error => {
        console.error("Error fetching conversation details:", error);
      });
  });
}

function markConversationAsRead(conversationId) {
  openDB(() => {
    const tx = db.transaction(["conversations"], "readwrite");
    const store = tx.objectStore("conversations");
    const request = store.get(conversationId);
    request.onsuccess = (event) => {
      const conv = event.target.result;
      if (conv && conv.isUnread) {
        conv.isUnread = false;
        conv.updated_at = new Date().toISOString();
        store.put(conv);
      }
    };
    request.onerror = (event) => {
      console.error("Error marking conversation as read:", event.target.error);
    };
  });
}

function openChat(conversationId) {
  window.location.href = `chat.html?conversationId=${conversationId}`;
}

function getVehicleDetails(vehicleId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const request = store.get(vehicleId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

function getUserDetails(userId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      if (!db.objectStoreNames.contains("users"))
        return reject("Users store not found.");
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.get(userId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}
