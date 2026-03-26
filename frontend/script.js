const apiUrl = window.APP_CONFIG.API_BASE_URL;
const user_id = Number(localStorage.getItem("user_id")) || 1;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.replace("login.html"); // prevents back-button returning
    return;
  }
    const chatContainer = document.getElementById("chatContainer");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    //Logout 
//    const token = localStorage.getItem("token");
//     console.log("token in storage:", token);

//     if (!token) {
//         window.location.href = "login.html";
//         return; 
//     }

//     const logoutBtn = document.getElementById("logoutBtn");
//     console.log("logoutBtn:", logoutBtn);

//     if (logoutBtn) {
//         logoutBtn.addEventListener("click", () => {
//         alert("Logout clicked ✅");
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//         localStorage.removeItem("user_id"); 
//         window.location.href = "login.html";
//         });
//     }
    // --- Auto-grow text input ---
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // --- Render a message bubble ---
    function renderMessage(msg) {
        const wrapper = document.createElement("div");
        wrapper.className = `flex ${msg.is_bot ? "justify-start" : "justify-end"}`;

        const bubble = document.createElement("div");
        bubble.className = `
      ${msg.is_bot ? "bg-gray-200 text-gray-800" : "bg-indigo-600 text-white"}
      rounded-2xl px-4 py-2 max-w-[75%] shadow-md relative
      ${msg.is_email ? "border border-indigo-200 italic" : ""}
    `;

        const timestamp = formatTimestamp(msg.timestamp);

        bubble.innerHTML = `
      <p class="whitespace-pre-wrap break-words">${msg.message}</p>
      <span class="text-xs opacity-70 block mt-1 text-right">${timestamp}</span>
    `;

        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- Display loading bubble (optional) ---
    function renderLoadingBubble() {
        const wrapper = document.createElement("div");
        wrapper.className = "flex justify-start";
        const bubble = document.createElement("div");
        bubble.className =
            "bg-gray-200 text-gray-600 rounded-2xl px-4 py-2 max-w-[75%] shadow-md animate-pulse";
        bubble.textContent = "Thinking...";
        wrapper.id = "loadingBubble";
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- Remove loading bubble ---
    function removeLoadingBubble() {
        const loading = document.getElementById("loadingBubble");
        if (loading) loading.remove();
    }

    // --- Handle sending messages ---
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem("user_id");
        console.log("User ID:", userId);
        const text = chatInput.value.trim();
        if (!text) return;

        sendBtn.disabled = true;

        const userMessage = {
            user_id: user_id.toString(),
            is_bot: false,
            is_response: false,
            is_email: false,
            message: text,
            timestamp: new Date(),
        };
        renderMessage(userMessage);
        chatInput.value = "";
        chatInput.style.height = "auto";

        renderLoadingBubble();

        try {
            const res = await fetch(apiUrl + "/api/chat/" + user_id, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userMessage),
            });
            if (!res.ok) throw new Error("Server error");
            const botMessage = await res.json();
            removeLoadingBubble();
            renderMessage({
                ...botMessage,
                is_bot: true,
                timestamp: botMessage.timestamp || new Date(),
            });
        } catch (err) {
            console.error(err);
            removeLoadingBubble();
            renderMessage({
                is_bot: true,
                is_response: true,
                is_email: false,
                message: "⚠️ Could not connect to the server. Please try again.",
                timestamp: new Date(),
            });
        } finally {
            sendBtn.disabled = false;
        }
    });

    // --- Load dummy chat history for testing ---
    async function loadChatHistory() {
        try {
          const res = await fetch(apiUrl + "/api/messages/byUserId/" + user_id);
          console.log("Response:", res);
          if (!res.ok) return;
          const messages = await res.json();
          messages.forEach(renderMessage);
        } catch (e) {
          console.warn("No chat history found.");
        }
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            // Today - show only time
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            // Yesterday
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffInHours < 168) {
            // Within last week - show day name
            return `${date.toLocaleDateString([], { weekday: 'short' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            // Older - show full date
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            }) + ' at ' + date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }

    // Load messages on startup
    loadChatHistory();
});
