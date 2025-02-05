document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.go(-2);
    
    });
  }
  loadConversations();
});

function loadConversations() {
  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!currentUser) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  openDB(() => {
    if (!db.objectStoreNames.contains("conversations")) {
      console.error("Conversations store not found.");
      return;
    }
    const tx = db.transaction(["conversations"], "readonly");
    const store = tx.objectStore("conversations");
    const request = store.getAll();

    request.onsuccess = (event) => {
      let convs = event.target.result;
      if (!convs || convs.length === 0) {
        console.log("No conversation records found. Generating from messages...");
        createConversationsFromMessages()
          .then(newConvs => {
            convs = newConvs;
            displayConversations(filterUserConversations(convs, currentUser));
          })
          .catch(err => console.error("Error generating conversations:", err));
      } else {
        displayConversations(filterUserConversations(convs, currentUser));
      }
    };

    request.onerror = (event) => {
      console.error("Error fetching conversations:", event.target.error);
    };
  });
}

function filterUserConversations(convs, currentUser) {
  return convs.filter(conv =>
    conv.sender_id === currentUser.user_id || conv.receiver_id === currentUser.user_id
  );
}

function createConversationsFromMessages() {
  return new Promise((resolve, reject) => {
    openDB(() => {
      if (!db.objectStoreNames.contains("messages")) {
        return reject("Messages store not found.");
      }
      const tx = db.transaction(["messages"], "readonly");
      const store = tx.objectStore("messages");
      const request = store.getAll();

      request.onsuccess = (event) => {
        const messages = event.target.result;
        const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
        const convMap = {};
        messages.forEach(msg => {
          if (msg.sender_id !== currentUser.user_id && msg.receiver_id !== currentUser.user_id) {
            return;
          }
          const otherPartyId = (msg.sender_id === currentUser.user_id) ? msg.receiver_id : msg.sender_id;
          const convKey = `${msg.vehicle_id}_${otherPartyId}`;
          if (!convMap[convKey]) {
            convMap[convKey] = {
              conversation_id: convKey,
              sender_id: currentUser.user_id,
              receiver_id: otherPartyId,
              vehicle_id: msg.vehicle_id,
              isUnread: true,
              updated_at: msg.timestamp
            };
          } else {
            if (new Date(msg.timestamp) > new Date(convMap[convKey].updated_at)) {
              convMap[convKey].updated_at = msg.timestamp;
            }
          }
        });
        const convArray = Object.values(convMap);
        const convTx = db.transaction(["conversations"], "readwrite");
        const convStore = convTx.objectStore("conversations");
        convArray.forEach(conv => convStore.put(conv));
        convTx.oncomplete = () => {
          console.log("Conversations created from messages.");
          resolve(convArray);
        };
        convTx.onerror = (event) => {
          console.error("Error saving conversations:", event.target.error);
          reject(event.target.error);
        };
      };

      request.onerror = (event) => {
        console.error("Error fetching messages:", event.target.error);
        reject(event.target.error);
      };
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
    const otherPartyId = conv.sender_id === currentUser.user_id ? conv.receiver_id : conv.sender_id;

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
      if (!db.objectStoreNames.contains("users")) {
        return reject("Users store not found.");
      }
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.get(userId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}
