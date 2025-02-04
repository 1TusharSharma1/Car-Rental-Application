document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get("vehicleId");
    const otherPartyId = urlParams.get("otherPartyId");
  
    if (!vehicleId || !otherPartyId) {
      alert("Invalid conversation parameters.");
      return;
    }
  
    loadConversation(vehicleId, otherPartyId);
  
    document.getElementById("messageForm").addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(vehicleId, otherPartyId);
    });
  });
  
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
  
  function loadConversation(vehicleId, otherPartyId) {
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
        const conversation = allMessages.filter(msg => {
          return msg.vehicle_id === vehicleId &&
            ((msg.sender_id === currentUser.user_id && msg.receiver_id === otherPartyId) ||
             (msg.sender_id === otherPartyId && msg.receiver_id === currentUser.user_id));
        });
        
        conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        displayMessages(conversation);
        updateChatHeader(vehicleId, otherPartyId);
      };
  
      request.onerror = (event) => {
        console.error("Error fetching messages:", event.target.error);
      };
    });
  }
  
  function displayMessages(messages) {
    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";
  
    if (!messages || messages.length === 0) {
      container.innerHTML = "<p>No messages yet.</p>";
      return;
    }
  
    const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    
    messages.forEach(msg => {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message");
      if (msg.sender_id === currentUser.user_id) {
        messageDiv.classList.add("sent");
      } else {
        messageDiv.classList.add("received");
      }
      
      messageDiv.innerHTML = `
        <p>${msg.content}</p>
        <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
      `;
      
      container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
  }
  
  function updateChatHeader(vehicleId, otherPartyId) {
    const header = document.getElementById("chatHeader");
    Promise.all([
      getVehicleDetails(vehicleId),
      getUserDetails(otherPartyId)
    ])
    .then(([vehicle, otherUser]) => {
      const vehicleName = vehicle ? vehicle.vehicle_model : vehicleId;
      const otherUserName = otherUser ? otherUser.username : otherPartyId;
      header.innerHTML = `<strong>Conversation for Vehicle:</strong> ${vehicleName} | <strong>Chat with:</strong> ${otherUserName}`;
    })
    .catch(error => {
      console.error("Error updating chat header:", error);
      header.innerHTML = `<strong>Conversation for Vehicle:</strong> ${vehicleId} | <strong>Chat with:</strong> ${otherPartyId}`;
    });
  }
  

  function sendMessage(vehicleId, otherPartyId) {
    const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!currentUser) {
      alert("Please log in.");
      window.location.href = "login.html";
      return;
    }
    
    const messageInput = document.getElementById("messageInput");
    const content = messageInput.value.trim();
    if (!content) return;
    
    const messageData = {
      message_id: crypto.randomUUID(),
      sender_id: currentUser.user_id,
      receiver_id: otherPartyId,
      vehicle_id: vehicleId,
      content: content,
      timestamp: new Date().toISOString()
    };
  
    openDB(() => {
      const tx = db.transaction(["messages"], "readwrite");
      const store = tx.objectStore("messages");
      const request = store.add(messageData);
      
      request.onsuccess = () => {
        messageInput.value = "";
        loadConversation(vehicleId, otherPartyId);
      };
      
      request.onerror = (event) => {
        console.error("Error sending message:", event.target.error);
      };
    });
  }
  