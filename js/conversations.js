document.addEventListener("DOMContentLoaded", () => {
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
      if (!db.objectStoreNames.contains("messages")) {
        console.error("Messages store not found.");
        return;
      }
      const tx = db.transaction(["messages"], "readonly");
      const store = tx.objectStore("messages");
      const request = store.getAll();
  
      request.onsuccess = (event) => {
        const allMessages = event.target.result;
        const userMessages = allMessages.filter(msg =>
          msg.sender_id === currentUser.user_id || msg.receiver_id === currentUser.user_id
        );
        const conversations = {};
        userMessages.forEach(msg => {
          const otherPartyId = (msg.sender_id === currentUser.user_id) ? msg.receiver_id : msg.sender_id;
          const convKey = `${msg.vehicle_id}_${otherPartyId}`;
          if (!conversations[convKey]) {
            conversations[convKey] = {
              vehicleId: msg.vehicle_id,
              otherPartyId: otherPartyId,
              messages: [msg],
              lastMessageTime: new Date(msg.timestamp)
            };
          } else {
            conversations[convKey].messages.push(msg);
            const msgTime = new Date(msg.timestamp);
            if (msgTime > conversations[convKey].lastMessageTime) {
              conversations[convKey].lastMessageTime = msgTime;
            }
          }
        });
  
        const conversationList = Object.values(conversations).sort(
          (a, b) => b.lastMessageTime - a.lastMessageTime
        );
  
        displayConversations(conversationList);
      };
  
      request.onerror = (event) => {
        console.error("Error fetching messages:", event.target.error);
      };
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
      Promise.all([
        getVehicleDetails(conv.vehicleId),
        getUserDetails(conv.otherPartyId)
      ])
      .then(([vehicle, otherUser]) => {
        const vehicleName = vehicle ? vehicle.vehicle_model : conv.vehicleId;
        const otherUserName = otherUser ? otherUser.username : conv.otherPartyId;
        const sortedMsgs = conv.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const lastMsg = sortedMsgs[0];
        const snippet = lastMsg.content.length > 30
          ? lastMsg.content.substring(0, 30) + "..."
          : lastMsg.content;
        
        const convItem = document.createElement("div");
        convItem.classList.add("conversation-item");
        convItem.innerHTML = `
          <div class="conversation-title">${vehicleName}</div>
          <div class="conversation-details">
            Chat with: ${otherUserName}<br>
            Last message: ${snippet}<br>
            ${new Date(conv.lastMessageTime).toLocaleString()}
          </div>
        `;
        convItem.addEventListener("click", () => {
          openChat(conv.vehicleId, conv.otherPartyId);
        });
        listContainer.appendChild(convItem);
      })
      .catch(error => {
        console.error("Error fetching conversation details:", error);
      });
    });
  }
  
  function getVehicleDetails(vehicleId) {
    return new Promise((resolve, reject) => {
      openDB(() => {
        const tx = db.transaction(["vehicles"], "readonly");
        const store = tx.objectStore("vehicles");
        const request = store.get(vehicleId);
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
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
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
  }
  
  function openChat(vehicleId, otherPartyId) {
    window.location.href = `chat.html?vehicleId=${vehicleId}&otherPartyId=${otherPartyId}`;
  }
  