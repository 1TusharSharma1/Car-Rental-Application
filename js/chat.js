document.addEventListener("DOMContentLoaded", () => {
  // Extract conversationId from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const conversationId = urlParams.get("conversationId");

  if (!conversationId) {
    alert("Invalid conversation parameters.");
    return;
  }

  console.log("Loading conversation with ID:", conversationId);
  loadConversation(conversationId);

  // Handle sending new messages
  const messageForm = document.getElementById("messageForm");
  if (messageForm) {
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(conversationId);
    });
  }

  // (Optional) If we want to log attachments
  const attachmentInput = document.getElementById("attachmentInput");
  if (attachmentInput) {
    attachmentInput.addEventListener("change", () => {
      console.log("Attachment selected:", attachmentInput.files[0]);
    });
  }

  const backBtn = document.getElementById("backToConversationsBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "conversations.html";
    });
  }
});

/**
 * Load all messages for the given conversationId and display them.
 */
function loadConversation(conversationId) {
  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!currentUser) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  openDB(() => {
    // Ensure messages store and index exist
    if (!db.objectStoreNames.contains("messages")) {
      console.error("Messages store not found in IndexedDB. Check db.js schema.");
      return;
    }

    const tx = db.transaction(["messages"], "readonly");
    const store = tx.objectStore("messages");

    let index;
    try {
      index = store.index("conversation_id");
    } catch (err) {
      console.error("Index 'conversation_id' not found in messages store. Check db.js.", err);
      return;
    }

    console.log("Querying messages for conversation_id:", conversationId);
    const request = index.getAll(IDBKeyRange.only(conversationId));

    request.onsuccess = (event) => {
      const messages = event.target.result || [];
      console.log("Messages loaded:", messages);

      // Sort by timestamp ascending
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      displayMessages(messages);
      updateChatHeader(conversationId);
    };

    request.onerror = (event) => {
      console.error("Error fetching messages:", event.target.error);
    };
  });
}

/**
 * Display the messages in the messagesContainer, applying .sent or .received classes.
 */
function displayMessages(messages) {
  const container = document.getElementById("messagesContainer");
  if (!container) {
    console.error("messagesContainer element not found in the DOM.");
    return;
  }

  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = "<p>No messages yet.</p>";
    return;
  }

  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  messages.forEach(msg => {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    // If this message's sender is the current user, it's "sent"; else "received"
    if (msg.sender_id === currentUser.user_id) {
      messageDiv.classList.add("sent");
    } else {
      messageDiv.classList.add("received");
    }

    // Build message HTML
    let contentHTML = `<p>${msg.content}</p>`;
    if (msg.attachment_url) {
      contentHTML += `<img src="${msg.attachment_url}" alt="attachment" class="message-attachment">`;
    }
    contentHTML += `<div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>`;

    messageDiv.innerHTML = contentHTML;
    container.appendChild(messageDiv);
  });

  // Scroll to bottom so latest messages are visible
  container.scrollTop = container.scrollHeight;
}

/**
 * Update chat header with vehicle name and the other user's name.
 */
function updateChatHeader(conversationId) {
  openDB(() => {
    if (!db.objectStoreNames.contains("conversations")) {
      console.error("Conversations store not found. Check db.js schema.");
      return;
    }
    const tx = db.transaction(["conversations"], "readonly");
    const store = tx.objectStore("conversations");
    const request = store.get(conversationId);

    request.onsuccess = (event) => {
      const conv = event.target.result;
      if (!conv) {
        console.warn("No conversation record found for:", conversationId);
        return;
      }

      const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
      // The other party is conv.sender_id if the current user is the receiver, etc.
      const otherPartyId = (conv.receiver_id === currentUser.user_id)
        ? conv.sender_id
        : conv.receiver_id;

      Promise.all([
        getVehicleDetails(conv.vehicle_id),
        getUserDetails(otherPartyId)
      ])
      .then(([vehicle, otherUser]) => {
        const vehicleName = vehicle ? vehicle.vehicle_model : conv.vehicle_id;
        const otherUserName = otherUser ? otherUser.username : otherPartyId;
        document.getElementById("chatHeader").innerHTML = `<strong>${vehicleName}</strong> — Chat with <strong>${otherUserName}</strong>`;
      })
      .catch(error => {
        console.error("Error updating chat header:", error);
      });
    };

    request.onerror = (event) => {
      console.error("Error fetching conversation details:", event.target.error);
    };
  });
}

/**
 * Retrieve vehicle details by ID.
 */
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

/**
 * Retrieve user details by user ID from the "users" store.
 */
function getUserDetails(userId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      if (!db.objectStoreNames.contains("users")) {
        return reject("Users store not found. Check db.js schema.");
      }
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.get(userId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

/**
 * Send a new message: fill out sender_id, receiver_id, conversation_id, etc.
 */
function sendMessage(conversationId) {
  const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!currentUser) {
    alert("Please log in.");
    return;
  }

  const messageInput = document.getElementById("messageInput");
  const content = messageInput.value.trim();
  const attachmentInput = document.getElementById("attachmentInput");
  if (!content && (!attachmentInput || attachmentInput.files.length === 0)) {
    return; // nothing to send
  }

  // Prepare basic message data
  const messageData = {
    message_id: crypto.randomUUID(),
    conversation_id: conversationId,
    content: content,
    timestamp: new Date().toISOString(),
    vehicle_id: null,
    attachment_url: "",
    status: "sent",
    // NEW: store who is sending + who is receiving
    sender_id: currentUser.user_id,
    receiver_id: null  // We'll fill in from the conversation record
  };

  openDB(() => {
    // Grab conversation details to figure out which user is the 'other' side
    const tx = db.transaction(["conversations"], "readonly");
    const store = tx.objectStore("conversations");
    const req = store.get(conversationId);

    req.onsuccess = (event) => {
      const conv = event.target.result;
      if (!conv) {
        console.error("Conversation not found for ID:", conversationId);
        return;
      }

      // If the current user is conv.sender_id, the other user is conv.receiver_id; else vice versa
      if (conv.sender_id === currentUser.user_id) {
        messageData.receiver_id = conv.receiver_id;
      } else {
        messageData.receiver_id = conv.sender_id;
      }

      messageData.vehicle_id = conv.vehicle_id || null;

      // If there's an attachment, read it. Otherwise, just add the message
      if (attachmentInput && attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
          messageData.attachment_url = e.target.result; // base64-encoded image
          addMessage(messageData);
        };
        reader.onerror = function(e) {
          console.error("Error reading attachment file.");
          addMessage(messageData);
        };
        reader.readAsDataURL(file);
      } else {
        addMessage(messageData);
      }
    };

    req.onerror = (event) => {
      console.error("Error retrieving conversation record:", event.target.error);
    };
  });
}

/**
 * Actually store the message in the "messages" store and reload the conversation.
 */
function addMessage(messageData) {
  openDB(() => {
    const tx = db.transaction(["messages"], "readwrite");
    const store = tx.objectStore("messages");
    store.add(messageData).onsuccess = () => {
      // Clear the message input field
      const msgInput = document.getElementById("messageInput");
      if (msgInput) msgInput.value = "";

      // Clear any attachment input
      const attachmentInput = document.getElementById("attachmentInput");
      if (attachmentInput) attachmentInput.value = "";

      // Reload conversation messages
      loadConversation(messageData.conversation_id);
    };
  });
}
