/* =========================================================
   ReFoundly - Messages / Conversations
   Complete clean replacement with Mobile Slide-Over Fix
   ========================================================= */

"use strict";

/* =========================================================
   STATE
   ========================================================= */

let conversations = [];
let currentConversationId = null;
let currentConversation = null;
let currentMessages = [];

let agreementStatus = {
    userAgreed: false,
    otherUserAgreed: false,
    totalAgreed: 0,
    status: "pending",
    barangay: null,
    meetupDate: null,
    meetupTime: null,
    transactionReportPath: null
};

let itemCardExpanded = false;
let itemDetailsCache = null;

let messagePollingInterval = null;
let conversationPollingInterval = null;
let agreementPollingInterval = null;

let messagePollRunning = false;
let conversationPollRunning = false;
let agreementPollRunning = false;

let lastMessageSignature = "";

const revealedImageCache = new Map();
let currentUserConfirmedItem = false;

const REQUIRED_CONFIRM_MESSAGE = "confirm item";

const MESSAGE_POLL_INTERVAL = 1000;
const CONVERSATION_POLL_INTERVAL = 5000;
const AGREEMENT_POLL_INTERVAL = 3000;

// All 31 Barangays in Dagupan City
const DAGUPAN_BARANGAYS = [
    "Bacayao Norte Barangay Hall",
    "Bacayao Sur Barangay Hall",
    "Barangay I (T. Bugallon) Hall",
    "Barangay II (Nueva) Hall",
    "Barangay IV (Zamora) Hall",
    "Bolosan Barangay Hall",
    "Bonuan Binloc Barangay Hall",
    "Bonuan Boquig Barangay Hall",
    "Bonuan Gueset Barangay Hall",
    "Calmay Barangay Hall",
    "Carael Barangay Hall",
    "Caranglaan Barangay Hall",
    "Herrero Barangay Hall",
    "Lasip Chico Barangay Hall",
    "Lasip Grande Barangay Hall",
    "Lomboy Barangay Hall",
    "Lucao Barangay Hall",
    "Malued Barangay Hall",
    "Mamalingling Barangay Hall",
    "Mangin Barangay Hall",
    "Mayombo Barangay Hall",
    "Pantal Barangay Hall",
    "Poblacion Oeste Barangay Hall",
    "Pogo Chico Barangay Hall",
    "Pogo Grande Barangay Hall",
    "Pugaro Suit Barangay Hall",
    "Salapingao Barangay Hall",
    "Salisay Barangay Hall",
    "Tambac Barangay Hall",
    "Tapuac Barangay Hall",
    "Tebeng Barangay Hall"
];

/* =========================================================
   DOM
   ========================================================= */

const chatList = document.getElementById("chatList");
const chatBody = document.getElementById("chatBody");
const chatFooter = document.getElementById("chatFooter");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const chatImageInput = document.getElementById("chatImageInput");
const currentUserName = document.getElementById("currentUserName");
const currentItemName = document.getElementById("currentItemName");
const chatSearch = document.getElementById("chatSearch");

const chatHeaderActions = document.getElementById("chatHeaderActions");
const reportUserBtn = document.getElementById("reportUserBtn");

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        createAgreementModal();
        createRescheduleModal();
        createItemDetailsModal();
        createImageConsentModal();
        createReportUserModal();

        setupSearch();
        setupSendMessage();
        setupImageUpload();
        setupAgreementEvents();
        setupItemDetailsEvents();
        setupReportUserButton();
        setupMobileBackButton();

        await loadCurrentUser();

        if (!window.currentUserId) {
            console.warn("No logged-in user found.");
            showEmptyState("Please log in to use messages.");
            return;
        }

        await loadConversations();

        const params = new URLSearchParams(window.location.search);
        const directConversationId = params.get("conversation") || params.get("conversationId") || null;
        const targetUserId = params.get("userId") || params.get("user") || null;
        const itemId = params.get("itemId") || params.get("item") || null;

        if (directConversationId) {
            await openConversation(directConversationId);
            window.history.replaceState({}, document.title, "message.html");
        } else if (targetUserId && itemId) {
            await startConversationFromItem(targetUserId, itemId);
        } else if (targetUserId) {
            await startConversationWithUser(targetUserId);
        } else {
            showEmptyState();
        }

        startConversationListPolling();

    } catch (error) {
        console.error("Message page initialization error:", error);
    }
}

/* =========================================================
   MOBILE BACK BUTTON SETUP
   ========================================================= */

function setupMobileBackButton() {
    const currentUserContainer = document.querySelector(".current-user");
    if (!currentUserContainer) return;

    if (!document.getElementById("mobileBackBtn")) {
        const backBtn = document.createElement("button");
        backBtn.id = "mobileBackBtn";
        backBtn.className = "mobile-back-btn";
        backBtn.type = "button";
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
        backBtn.title = "Back to Inbox";
        
        backBtn.addEventListener("click", () => {
            showEmptyState();
        });

        currentUserContainer.parentNode.insertBefore(backBtn, currentUserContainer);
    }
}

/* =========================================================
   USER
   ========================================================= */

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/get-session-info", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to get session.");
        }

        const data = await response.json();

        if (data.success && data.userId) {
            window.currentUserId = Number(data.userId);
        }

    } catch (error) {
        console.error("loadCurrentUser:", error);
    }
}

/* =========================================================
   CONVERSATIONS
   ========================================================= */

async function loadConversations(options = {}) {
    const silent = options.silent === true;

    if (conversationPollRunning) {
        return conversations;
    }

    conversationPollRunning = true;

    try {
        const response = await fetch("/api/conversations", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.href = "index.html";
            return [];
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load conversations.");
        }

        const newList = Array.isArray(data.conversations) ? data.conversations : [];
        const changed = conversationsChanged(conversations, newList);

        conversations = newList;

        if (!silent || changed) {
            renderConversationList(conversations);
        }

        return conversations;

    } catch (error) {
        console.error("loadConversations:", error);

        if (!silent && chatList) {
            chatList.innerHTML = `
                <div class="empty-chat-list">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to load conversations.</p>
                </div>
            `;
        }

        return [];
    } finally {
        conversationPollRunning = false;
    }
}

function conversationsChanged(oldList, newList) {
    if (oldList.length !== newList.length) {
        return true;
    }

    for (let i = 0; i < newList.length; i++) {
        const oldItem = oldList[i];
        const newItem = newList[i];

        if (String(oldItem?.conversation_id) !== String(newItem?.conversation_id)) {
            return true;
        }

        if (String(oldItem?.last_message || "") !== String(newItem?.last_message || "")) {
            return true;
        }

        if (Number(oldItem?.unread_count || 0) !== Number(newItem?.unread_count || 0)) {
            return true;
        }
    }

    return false;
}

function renderConversationList(list) {
    if (!chatList) return;

    chatList.innerHTML = "";

    if (!list || list.length === 0) {
        chatList.innerHTML = `
            <div class="empty-chat-list">
                <i class="fas fa-comments"></i>
                <p>No conversations yet.</p>
            </div>
        `;
        return;
    }

    list.forEach(conversation => {
        const conversationId = conversation.conversation_id;
        const name = conversation.other_user_name || conversation.other_user_email || "Unknown User";
        const lastMessage = conversation.last_message || "No messages yet";
        const unread = Number(conversation.unread_count || 0);

        const item = document.createElement("div");
        item.className = "chat-item";

        if (Number(conversationId) === Number(currentConversationId)) {
            item.classList.add("active");
        }

        const avatarName = encodeURIComponent(name);

        item.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${avatarName}&background=6B9E45&color=fff" alt="User" loading="lazy">
            <div class="preview-text">
                <h4>${escapeHtml(name)}</h4>
                <p>${escapeHtml(lastMessage)}</p>
                ${unread > 0 ? `<span class="chat-unread">${unread}</span>` : ""}
            </div>
        `;

        item.addEventListener("click", () => openConversation(conversationId));
        chatList.appendChild(item);
    });
}

/* =========================================================
   START CONVERSATION
   ========================================================= */

async function startConversationFromItem(targetUserId, itemId) {
    if (isSelf(targetUserId)) {
        showEmptyState();
        return;
    }

    try {
        const response = await fetch("/api/conversations/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                userId: Number(targetUserId),
                itemId: Number(itemId)
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || "Unable to start conversation.");
            return;
        }

        const conversationId = data.conversationId || data.conversation_id;

        if (!conversationId) {
            alert("Conversation was created but no conversation ID was returned.");
            return;
        }

        await loadConversations();
        await openConversation(conversationId);

        window.history.replaceState({}, document.title, "message.html");

    } catch (error) {
        console.error("startConversationFromItem:", error);
        alert("Unable to start conversation.");
    }
}

async function startConversationWithUser(targetUserId) {
    if (isSelf(targetUserId)) {
        showEmptyState();
        return;
    }

    try {
        const response = await fetch("/api/conversations/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                userId: Number(targetUserId)
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || "Unable to start conversation.");
            return;
        }

        const conversationId = data.conversationId || data.conversation_id;

        if (!conversationId) {
            alert("No conversation ID returned.");
            return;
        }

        await loadConversations();
        await openConversation(conversationId);

        window.history.replaceState({}, document.title, "message.html");

    } catch (error) {
        console.error("startConversationWithUser:", error);
        alert("Unable to start conversation.");
    }
}

function isSelf(userId) {
    return window.currentUserId && Number(window.currentUserId) === Number(userId);
}

/* =========================================================
   OPEN CONVERSATION
   ========================================================= */

async function openConversation(conversationId) {
    if (!conversationId) return;

    stopMessagePolling();
    stopAgreementPolling();

    currentConversationId = Number(conversationId);
    currentConversation = null;
    currentMessages = [];

    itemDetailsCache = null;
    lastMessageSignature = "";

    resetAgreementStatus();
    updateConversationHeader();

    // Trigger mobile slide over view
    const wrapper = document.querySelector(".messaging-wrapper");
    if (wrapper) wrapper.classList.add("mobile-chat-active");

    if (chatFooter) {
        chatFooter.style.display = "none";
    }

    if (chatBody) {
        chatBody.innerHTML = `
            <div class="conversation-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading conversation...</p>
            </div>
        `;
    }

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.href = "index.html";
            return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to open conversation.");
        }

        currentConversation = data.conversation || data.data || {};

        updateConversationHeader();

        if (chatFooter) {
            chatFooter.style.display = "flex";
        }

        renderAgreementBar();

        await loadMessages(currentConversationId, true);
        await loadAgreementStatus();

        renderConversationList(conversations);

        startMessagePolling();
        startAgreementPolling();

    } catch (error) {
        console.error("openConversation:", error);

        if (chatBody) {
            chatBody.innerHTML = `
                <div class="empty-chat-list">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to open conversation.</p>
                </div>
            `;
        }
    }
}

function updateConversationHeader() {
    if (!currentConversation) {
        if (currentUserName) currentUserName.textContent = "Select a conversation";
        if (currentItemName) currentItemName.textContent = "";
        if (chatHeaderActions) chatHeaderActions.style.display = "none";
        renderItemFloatingCard();
        return;
    }

    if (currentUserName) {
        currentUserName.textContent = currentConversation.other_user_name || currentConversation.other_user_email || "User";
    }

    if (currentItemName) {
        currentItemName.textContent = currentConversation.item_name ? `Item: ${currentConversation.item_name}` : "";
    }

    if (chatHeaderActions) chatHeaderActions.style.display = "inline-flex";

    renderItemFloatingCard();
}

/* =========================================================
   ITEM FLOATING CARD
   ========================================================= */

function renderItemFloatingCard() {
    const card = document.getElementById("itemFloatingCard");
    if (!card) return;

    if (!currentConversation) {
        card.innerHTML = "";
        card.style.display = "none";
        itemCardExpanded = false;
        return;
    }

    card.style.display = "block";

    const name = currentConversation.item_name || "Item";
    const type = currentConversation.report_type ? currentConversation.report_type.toUpperCase() : "";
    const image = currentConversation.image_path || currentConversation.item_image || currentConversation.image_url || "";

    card.innerHTML = `
        <div class="item-floating-inner" id="itemFloatingToggle">
            ${image
                ? `<img src="${escapeAttribute(image)}" class="item-floating-image" alt="Item photo">`
                : `<div class="item-floating-image" style="display:flex;align-items:center;justify-content:center;"><i class="fas fa-box-open" style="color:#aaa;"></i></div>`
            }

            <div class="item-floating-info">
                <span class="item-floating-label">${type ? `${type} ITEM` : "REGARDING"}</span>
                <div class="item-floating-name">${escapeHtml(name)}</div>
                <div class="item-floating-subtitle">${itemCardExpanded ? "Tap to minimize" : "Tap to see full details"}</div>
            </div>

            <i class="fas ${itemCardExpanded ? "fa-chevron-up" : "fa-chevron-down"} item-floating-arrow"></i>
        </div>

        <div id="itemFloatingExpanded" class="item-floating-expanded" style="display:${itemCardExpanded ? "block" : "none"};">
            <div class="item-floating-loading">
                <i class="fas fa-spinner fa-spin"></i> Loading details...
            </div>
        </div>
    `;

    const toggle = document.getElementById("itemFloatingToggle");
    if (toggle) {
        toggle.addEventListener("click", toggleItemFloatingCard);
    }

    if (itemCardExpanded) {
        populateItemFloatingExpanded();
    }
}

async function toggleItemFloatingCard() {
    itemCardExpanded = !itemCardExpanded;
    renderItemFloatingCard();
}

async function populateItemFloatingExpanded() {
    const container = document.getElementById("itemFloatingExpanded");
    if (!container) return;

    try {
        const item = await getItemDetails();

        const category = firstValue(item, ["category", "item_category"], "N/A");
        const location = firstValue(item, ["location", "item_location"], "N/A");
        const date = firstValue(item, ["incident_date", "item_date", "created_at", "date_reported"], "");
        const time = firstValue(item, ["incident_time"], "");
        const description = firstValue(item, ["description", "item_description"], "No description provided.");

        container.innerHTML = `
            <div class="item-floating-detail-row"><i class="fas fa-tag"></i> <span>${escapeHtml(category)}</span></div>
            <div class="item-floating-detail-row"><i class="fas fa-map-marker-alt"></i> <span>${escapeHtml(location)}</span></div>
            ${date ? `<div class="item-floating-detail-row"><i class="fas fa-calendar"></i> <span>${escapeHtml(formatDetailDate(date))}${time ? " &middot; " + escapeHtml(time) : ""}</span></div>` : ""}
            <div class="item-floating-detail-desc">${escapeHtml(description)}</div>
            <button type="button" class="item-floating-full-btn" id="itemFloatingFullBtn">
                <i class="fas fa-expand"></i> Open full details
            </button>
        `;

        const fullBtn = document.getElementById("itemFloatingFullBtn");
        if (fullBtn) {
            fullBtn.addEventListener("click", openItemDetailsModal);
        }
    } catch (error) {
        console.error("populateItemFloatingExpanded:", error);
        container.innerHTML = `<div class="item-floating-detail-desc">Unable to load full item details right now.</div>`;
    }
}

/* =========================================================
   MESSAGES
   ========================================================= */

async function loadMessages(conversationId, initial = false) {
    if (!conversationId) return [];

    if (messagePollRunning) {
        return currentMessages;
    }

    messagePollRunning = true;

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.href = "index.html";
            return [];
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load messages.");
        }

        const messages = Array.isArray(data.messages) ? data.messages : [];
        const signature = makeMessageSignature(messages);

        if (initial || signature !== lastMessageSignature) {
            renderMessages(messages, !initial);
            lastMessageSignature = signature;
            currentMessages = messages;
        }

        return messages;

    } catch (error) {
        console.error("loadMessages:", error);

        if (initial && chatBody) {
            chatBody.innerHTML = `
                <div class="empty-chat-list">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to load messages.</p>
                </div>
            `;
        }

        return [];
    } finally {
        messagePollRunning = false;
    }
}

function makeMessageSignature(messages) {
    if (!messages.length) return "empty";

    return messages.map(message => {
        return [
            message.id || message.message_id || "",
            message.sender_id || "",
            message.message || "",
            message.message_type || "",
            message.image_url || "",
            message.created_at || ""
        ].join("|");
    }).join("||");
}

function renderMessages(messages, preserveScroll = true) {
    if (!chatBody) return;

    const wasNearBottom = isChatNearBottom();
    const previousHeight = chatBody.scrollHeight;
    const previousTop = chatBody.scrollTop;

    const agreementBar = document.getElementById("agreementBar");
    const readyPanel = document.getElementById("transactionReadyPanel");
    const confirmedPanel = document.getElementById("confirmedPanel");
    const disputedPanel = document.getElementById("disputedPanel");

    chatBody.innerHTML = "";

    if (agreementBar) {
        chatBody.appendChild(agreementBar);
    }

    if (confirmedPanel && agreementStatus.status === "confirmed") {
        chatBody.appendChild(confirmedPanel);
    } else if (disputedPanel && agreementStatus.status === "disputed") {
        chatBody.appendChild(disputedPanel);
    } else if (readyPanel && agreementStatus.totalAgreed >= 2) {
        chatBody.appendChild(readyPanel);
    }

    if (!messages.length) {
        const empty = document.createElement("div");
        empty.className = "conversation-start";
        empty.innerHTML = `
            <i class="fas fa-comments"></i>
            <h3>Start a conversation</h3>
            <p>Say hello and discuss the item.</p>
        `;
        chatBody.appendChild(empty);
        return;
    }

    messages.forEach(message => {
        const element = document.createElement("div");
        const senderId = Number(message.sender_id);
        const own = senderId === Number(window.currentUserId);

        element.className = `msg ${own ? "sent" : "received"}`;
        const messageType = message.message_type || "text";

        if (messageType === "image") {
            const isSensitive = Boolean(message.is_sensitive);
            const remaining = message.remainingViews;
            const cachedUrl = revealedImageCache.get(message.id);
            const alreadyHasUrl = Boolean(message.image_url) || Boolean(cachedUrl);

            if (isSensitive && !own && cachedUrl) {
                element.innerHTML = `
                    <div class="message-image-wrapper sensitive revealed">
                        <img src="${escapeAttribute(cachedUrl)}" alt="Shared item" class="message-image" loading="lazy" draggable="false" oncontextmenu="return false;">
                    </div>
                    <small class="message-time">${formatMessageTime(message.created_at)}</small>
                `;
                const wrapper = element.querySelector(".message-image-wrapper");
                wrapper.addEventListener("click", () => wrapper.classList.toggle("revealed"));
            } else if (isSensitive && !own) {
                const exhausted = !alreadyHasUrl && remaining === 0;

                element.innerHTML = `
                    <div class="message-image-wrapper sensitive ${exhausted ? "exhausted" : ""}" data-message-id="${message.id}">
                        <div class="sensitive-lock-overlay">
                            ${exhausted
                                ? `<i class="fas fa-ban"></i><span>View limit reached</span>`
                                : `<i class="fas fa-eye"></i><span>Tap to view${remaining !== null && remaining !== undefined ? ` (${remaining} view${remaining === 1 ? "" : "s"} left)` : ""}</span>`
                            }
                        </div>
                    </div>
                    <small class="message-time">${formatMessageTime(message.created_at)}</small>
                `;

                if (!exhausted) {
                    const wrapper = element.querySelector(".message-image-wrapper");
                    wrapper.addEventListener("click", () => revealSensitiveImage(message.id, wrapper));
                }
            } else if (alreadyHasUrl) {
                element.innerHTML = `
                    <div class="message-image-wrapper${isSensitive ? " sensitive revealed" : ""}">
                        <img src="${escapeAttribute(message.image_url)}" alt="Shared item" class="message-image" loading="lazy" draggable="false" oncontextmenu="return false;">
                    </div>
                    <small class="message-time">${formatMessageTime(message.created_at)}</small>
                `;

                const img = element.querySelector(".message-image");
                if (isSensitive) {
                    const wrapper = element.querySelector(".message-image-wrapper");
                    wrapper.classList.remove("revealed");
                    wrapper.addEventListener("click", () => wrapper.classList.toggle("revealed"));
                } else {
                    img.addEventListener("click", () => window.open(message.image_url, "_blank"));
                }
            }
        } else {
            element.innerHTML = `
                <span>${escapeHtml(message.message || "")}</span>
                <small class="message-time">${formatMessageTime(message.created_at)}</small>
            `;
        }

        chatBody.appendChild(element);
    });

    if (!preserveScroll || wasNearBottom) {
        scrollChatToBottom();
    } else {
        chatBody.scrollTop = previousTop + (chatBody.scrollHeight - previousHeight);
    }
}

/* =========================================================
   MESSAGE POLLING
   ========================================================= */

function startMessagePolling() {
    stopMessagePolling();

    if (!currentConversationId) return;

    messagePollingInterval = setInterval(async () => {
        if (document.hidden || !currentConversationId) return;

        await loadMessages(currentConversationId, false);
        await loadConversations({ silent: true });
    }, MESSAGE_POLL_INTERVAL);
}

function stopMessagePolling() {
    if (messagePollingInterval !== null) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

/* =========================================================
   CONVERSATION POLLING
   ========================================================= */

function startConversationListPolling() {
    stopConversationListPolling();

    conversationPollingInterval = setInterval(async () => {
        if (document.hidden) return;

        await loadConversations({ silent: true });
    }, CONVERSATION_POLL_INTERVAL);
}

function stopConversationListPolling() {
    if (conversationPollingInterval !== null) {
        clearInterval(conversationPollingInterval);
        conversationPollingInterval = null;
    }
}

/* =========================================================
   AGREEMENT
   ========================================================= */

function resetAgreementStatus() {
    agreementStatus = {
        userAgreed: false,
        otherUserAgreed: false,
        totalAgreed: 0,
        status: "pending",
        barangay: null,
        meetupDate: null,
        meetupTime: null,
        transactionReportPath: null
    };
}

function hasUserConfirmedItem(messages = currentMessages) {
    if (!Array.isArray(messages) || !window.currentUserId) {
        return false;
    }

    return messages.some(message => {
        const senderId = Number(message.sender_id);
        const text = String(message.message || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        return senderId === Number(window.currentUserId) && text === REQUIRED_CONFIRM_MESSAGE;
    });
}

function renderAgreementBar() {
    if (!chatBody) return;

    const old = document.getElementById("agreementBar");
    if (old) old.remove();

    const bar = document.createElement("div");
    bar.id = "agreementBar";
    bar.className = "agreement-bar";

    bar.innerHTML = `
        <div class="agreement-info">
            <div class="agreement-icon">
                <i class="fas fa-handshake"></i>
            </div>
            <div class="agreement-main">
                <strong>Ready to settle this item?</strong>
                <p id="agreementDescription">
                    Before agreeing, both parties must type <strong>"Confirm Item"</strong> in this chat.
                </p>
                <div class="agreement-instruction">
                    <i class="fas fa-circle-info"></i>
                    <span>
                        Type <strong>Confirm Item</strong> as a message first. You can then click <strong>Agree</strong>.
                    </span>
                </div>
            </div>
        </div>

        <div class="agreement-actions">
            <span id="agreementCount" class="agreement-count">Agreement: 0/2</span>
            <button type="button" id="agreeDealBtn" class="agree-deal-btn" disabled>
                <i class="fas fa-lock"></i> Agree
            </button>
        </div>
    `;

    chatBody.prepend(bar);

    const button = document.getElementById("agreeDealBtn");
    if (button) {
        button.addEventListener("click", openAgreementModal);
    }

    currentUserConfirmedItem = hasUserConfirmedItem(currentMessages);
    updateAgreementUI();
}

async function loadAgreementStatus() {
    if (!currentConversationId || agreementPollRunning) return;

    agreementPollRunning = true;

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/agreement`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (response.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (response.status === 404) return;

        const data = await response.json();

        if (!response.ok || !data.success) return;

        const previousStatus = agreementStatus.status;

        agreementStatus = {
            userAgreed: Boolean(data.userAgreed ?? data.user_agreed ?? false),
            otherUserAgreed: Boolean(data.otherUserAgreed ?? data.other_user_agreed ?? false),
            totalAgreed: Number(data.totalAgreed ?? data.total_agreed ?? 0),
            status: data.status || "pending",
            barangay: data.barangay || agreementStatus.barangay || null,
            meetupDate: data.meetupDate || data.meetup_date || data.date || agreementStatus.meetupDate || null,
            meetupTime: data.meetupTime || data.meetup_time || data.time || agreementStatus.meetupTime || null,
            transactionReportPath: data.transactionReportPath || data.transaction_report_path || null,
            rescheduleReason: data.rescheduleReason || data.reschedule_reason || null
        };

        renderAgreementStateChange(previousStatus);

    } catch (error) {
        console.error("loadAgreementStatus:", error);
    } finally {
        agreementPollRunning = false;
    }
}

function renderAgreementStateChange(previousStatus) {
    const status = agreementStatus.status;

    updateAgreementUI();
    removeAgreementPanels();

    if (status === "both_agreed" || status === "admin_reviewing") {
        showTransactionReadyPanel();

        if (previousStatus !== "both_agreed" && previousStatus !== "admin_reviewing") {
            showToast("Both parties agreed. The transaction is now ready for admin review.");
            notifyAdminAgreementReady();
        }
    } else if (status === "awaiting_barangay" || status === "confirmed") {
        showConfirmedPanel();

        if (previousStatus !== "awaiting_barangay" && previousStatus !== "confirmed") {
            showToast("Confirmed by the admin. Waiting for barangay approval, please stand by.");
        }
    } else if (status === "barangay_approved") {
        showConfirmedPanel();

        if (previousStatus !== "barangay_approved") {
            showToast("The barangay approved your handover. Please bring a valid ID!");
        }
    } else if (status === "disputed") {
        showDisputedPanel();

        if (previousStatus !== "disputed") {
            showToast("An admin flagged this agreement for review.");
        }
    } else if (status === "reschedule_requested") {
        if (previousStatus !== "reschedule_requested") {
            showToast(agreementStatus.rescheduleReason
                ? `Reschedule needed: ${agreementStatus.rescheduleReason}. Please agree to a new schedule.`
                : "A reschedule was requested. Please review and agree again.");
        }
    }
}

function removeAgreementPanels() {
    ["transactionReadyPanel", "confirmedPanel", "disputedPanel"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

function updateAgreementUI() {
    const count = document.getElementById("agreementCount");
    const button = document.getElementById("agreeDealBtn");
    const description = document.getElementById("agreementDescription");

    const total = Math.max(0, Math.min(2, Number(agreementStatus.totalAgreed || 0)));

    if (count) {
        count.textContent = `Agreement: ${total}/2`;
    }

    if (agreementStatus.userAgreed) {
        if (button) {
            button.disabled = true;
            button.textContent = "Agreed";
        }

        if (description) {
            if (agreementStatus.otherUserAgreed || total >= 2) {
                description.textContent = "Both parties agreed. The transaction is ready for admin review.";
            } else {
                description.textContent = "You agreed. Waiting for the other party.";
            }
        }
    } else {
        if (button) {
            button.disabled = false;
            button.textContent = "Agree";
        }

        if (description) {
            description.textContent = "Both parties must agree before the transaction can be reviewed by an admin.";
        }
    }
}

/* =========================================================
   AGREEMENT MODAL
   ========================================================= */

function buildBarangayOptionsHTML() {
    let options = `<option value="" disabled selected>Select Barangay Hall...</option>`;
    DAGUPAN_BARANGAYS.forEach(b => {
        options += `<option value="${escapeAttribute(b)}">${escapeHtml(b)}</option>`;
    });
    return options;
}

function createAgreementModal() {
    if (document.getElementById("agreementModal")) return;

    const modal = document.createElement("div");
    modal.id = "agreementModal";
    modal.className = "agreement-modal";

    modal.innerHTML = `
        <div class="agreement-modal-content" role="dialog" aria-modal="true">
            <button type="button" id="closeAgreementModal" class="agreement-modal-close" aria-label="Close">&times;</button>

            <div class="agreement-modal-icon">
                <i class="fas fa-handshake"></i>
            </div>

            <h2>Agree to Settle This Item?</h2>

            <p class="agreement-modal-text">
                By agreeing, you confirm that you and the other party intend to proceed with settling this lost/found item through ReFoundly.
            </p>

            <div class="agreement-item-box">
                <div>
                    <span>Item</span>
                    <strong id="agreementModalItem">—</strong>
                </div>
                <div>
                    <span>Other Party</span>
                    <strong id="agreementModalUser">—</strong>
                </div>
            </div>

            <button type="button" id="viewItemDetailsBtn" class="view-item-details-btn">
                <i class="fas fa-eye"></i> View Item Details
            </button>

            <div class="agreement-warning">
                <i class="fas fa-info-circle"></i>
                <span>
                    Confirm Item: please make sure the item and details discussed in this chat are correct before agreeing.
                </span>
            </div>

            <div class="agreement-barangay-box" id="agreementBarangayBox">
                <label for="agreementBarangayInput">
                    <i class="fas fa-map-marker-alt"></i> Where will you meet to hand over the item?
                </label>
                <select id="agreementBarangayInput" class="agreement-barangay-select" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ccc; font-size:14px; margin-top:4px;">
                    ${buildBarangayOptionsHTML()}
                </select>
                <small class="agreement-barangay-hint">
                    Meetups happen at the barangay hall for everyone's safety.
                </small>
            </div>

            <div class="agreement-datetime-box" id="agreementDateTimeBox" style="margin-top: 12px; display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label for="agreementDateInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">
                        <i class="fas fa-calendar-alt"></i> Meetup Date
                    </label>
                    <input type="date" id="agreementDateInput" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label for="agreementTimeInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">
                        <i class="fas fa-clock"></i> Meetup Time
                    </label>
                    <input type="time" id="agreementTimeInput" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>

            <div class="agreement-progress">
                <div class="agreement-progress-title">Agreement Status</div>
                <div id="agreementModalCount" class="agreement-progress-count">0/2</div>
            </div>

            <div class="agreement-modal-actions">
                <button type="button" id="cancelAgreementBtn" class="agreement-cancel-btn">Cancel</button>
                <button type="button" id="confirmAgreementBtn" class="agreement-confirm-btn">
                    <i class="fas fa-check"></i> Yes, I Agree
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeAgreementModal();
        }
    });
}

function setupAgreementEvents() {
    document.addEventListener("click", event => {
        if (event.target.closest("#cancelAgreementBtn") || event.target.closest("#closeAgreementModal")) {
            closeAgreementModal();
        }

        if (event.target.closest("#confirmAgreementBtn")) {
            confirmAgreement();
        }
    });
}

function openAgreementModal() {
    if (!currentConversationId) {
        alert("Please select a conversation first.");
        return;
    }

    const modal = document.getElementById("agreementModal");
    if (!modal) return;

    const item = document.getElementById("agreementModalItem");
    const user = document.getElementById("agreementModalUser");
    const count = document.getElementById("agreementModalCount");

    if (item) {
        item.textContent = currentConversation?.item_name || "This item";
    }

    if (user) {
        user.textContent = currentConversation?.other_user_name || currentConversation?.other_user_email || "Other party";
    }

    if (count) {
        count.textContent = `${agreementStatus.totalAgreed}/2`;
    }

    const barangayBox = document.getElementById("agreementBarangayBox");
    if (barangayBox) {
        if (agreementStatus.barangay) {
            barangayBox.innerHTML = `
                <label><i class="fas fa-map-marker-alt"></i> Meetup location</label>
                <div class="agreement-barangay-readonly">${escapeHtml(agreementStatus.barangay)}</div>
                <small class="agreement-barangay-hint">
                    Already chosen by the other party — you're confirming this spot.
                </small>
            `;
        } else {
            barangayBox.innerHTML = `
                <label for="agreementBarangayInput">
                    <i class="fas fa-map-marker-alt"></i> Where will you meet to hand over the item?
                </label>
                <select id="agreementBarangayInput" class="agreement-barangay-select" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ccc; font-size:14px; margin-top:4px;">
                    ${buildBarangayOptionsHTML()}
                </select>
                <small class="agreement-barangay-hint">
                    Meetups happen at the barangay hall for everyone's safety.
                </small>
            `;
        }
    }

    const dateTimeBox = document.getElementById("agreementDateTimeBox");
    if (dateTimeBox) {
        if (agreementStatus.meetupDate) {
            const formattedDate = formatDetailDate(agreementStatus.meetupDate);
            const formattedTime = agreementStatus.meetupTime ? formatTimeDisplay(agreementStatus.meetupTime) : "Not specified";
            dateTimeBox.innerHTML = `
                <div style="flex: 1;">
                    <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; color: #555;">
                        <i class="fas fa-calendar-alt"></i> Meetup Date
                    </label>
                    <div class="agreement-barangay-readonly" style="padding: 8px 10px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; color: #333;">${escapeHtml(formattedDate)}</div>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; color: #555;">
                        <i class="fas fa-clock"></i> Meetup Time
                    </label>
                    <div class="agreement-barangay-readonly" style="padding: 8px 10px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; color: #333;">${escapeHtml(formattedTime)}</div>
                </div>
            `;
        } else {
            const today = new Date().toISOString().split("T")[0];
            dateTimeBox.innerHTML = `
                <div style="flex: 1;">
                    <label for="agreementDateInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; color: #333;">
                        <i class="fas fa-calendar-alt"></i> Meetup Date
                    </label>
                    <input type="date" id="agreementDateInput" value="${today}" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label for="agreementTimeInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; color: #333;">
                        <i class="fas fa-clock"></i> Meetup Time
                    </label>
                    <input type="time" id="agreementTimeInput" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
            `;
        }
    }

    modal.classList.add("show");
    document.body.classList.add("agreement-modal-open");
}

function closeAgreementModal() {
    const modal = document.getElementById("agreementModal");
    if (modal) {
        modal.classList.remove("show");
    }
    document.body.classList.remove("agreement-modal-open");
}

/* =========================================================
   CONFIRM AGREEMENT
   ========================================================= */

async function confirmAgreement() {
    if (!currentConversationId || agreementStatus.userAgreed) {
        return;
    }

    let barangayToSend = agreementStatus.barangay || "";
    if (!barangayToSend) {
        const barangayInput = document.getElementById("agreementBarangayInput");
        barangayToSend = barangayInput ? barangayInput.value.trim() : "";

        if (!barangayToSend) {
            alert("Please select a barangay hall meetup location before agreeing.");
            if (barangayInput) barangayInput.focus();
            return;
        }
    }

    let dateToSend = agreementStatus.meetupDate || "";
    if (!dateToSend) {
        const dateInput = document.getElementById("agreementDateInput");
        dateToSend = dateInput ? dateInput.value.trim() : "";

        if (!dateToSend) {
            alert("Please select a meetup date before agreeing.");
            if (dateInput) dateInput.focus();
            return;
        }
    }

    let timeToSend = agreementStatus.meetupTime || "";
    if (!timeToSend) {
        const timeInput = document.getElementById("agreementTimeInput");
        timeToSend = timeInput ? timeInput.value.trim() : "";

        if (!timeToSend) {
            alert("Please select a meetup time before agreeing.");
            if (timeInput) timeInput.focus();
            return;
        }
    }

    const button = document.getElementById("confirmAgreementBtn");

    if (button) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Confirming...`;
    }

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/agreement`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                agreed: true,
                barangay: barangayToSend,
                meetupDate: dateToSend,
                meetupTime: timeToSend,
                meetup_date: dateToSend,
                meetup_time: timeToSend
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to save your agreement.");
        }

        const previousStatus = agreementStatus.status;

        agreementStatus.userAgreed = Boolean(data.userAgreed ?? data.user_agreed ?? true);
        agreementStatus.otherUserAgreed = Boolean(data.otherUserAgreed ?? data.other_user_agreed ?? false);
        agreementStatus.totalAgreed = Number(data.totalAgreed ?? data.total_agreed ?? (agreementStatus.userAgreed ? agreementStatus.totalAgreed + 1 : agreementStatus.totalAgreed));
        agreementStatus.status = data.status || (agreementStatus.totalAgreed >= 2 ? "both_agreed" : "pending");
        agreementStatus.barangay = data.barangay || agreementStatus.barangay || barangayToSend;
        agreementStatus.meetupDate = data.meetupDate || data.meetup_date || dateToSend;
        agreementStatus.meetupTime = data.meetupTime || data.meetup_time || timeToSend;

        closeAgreementModal();
        renderAgreementStateChange(previousStatus);

        if (agreementStatus.status !== "both_agreed" && agreementStatus.status !== "admin_reviewing") {
            showToast("You agreed to the deal. Waiting for the other party.");
        }

    } catch (error) {
        console.error("confirmAgreement:", error);
        alert(error.message || "Unable to save your agreement.");

    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = `<i class="fas fa-check"></i> Yes, I Agree`;
        }
    }
}

/* =========================================================
   READY PANEL
   ========================================================= */

function showTransactionReadyPanel() {
    if (!chatBody) return;

    let panel = document.getElementById("transactionReadyPanel");
    if (panel) return;

    panel = document.createElement("div");
    panel.id = "transactionReadyPanel";
    panel.className = "transaction-ready-panel";

    const formattedDate = agreementStatus.meetupDate ? formatDetailDate(agreementStatus.meetupDate) : null;
    const formattedTime = agreementStatus.meetupTime ? formatTimeDisplay(agreementStatus.meetupTime) : null;

    let meetupDetailsHtml = "";
    if (agreementStatus.barangay || formattedDate || formattedTime) {
        meetupDetailsHtml = `<p class="transaction-ready-barangay">`;
        if (agreementStatus.barangay) {
            meetupDetailsHtml += `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(agreementStatus.barangay)}`;
        }
        if (formattedDate) {
            meetupDetailsHtml += `${agreementStatus.barangay ? " &middot; " : ""}<i class="fas fa-calendar-alt"></i> ${escapeHtml(formattedDate)}`;
        }
        if (formattedTime) {
            meetupDetailsHtml += ` &middot; <i class="fas fa-clock"></i> ${escapeHtml(formattedTime)}`;
        }
        meetupDetailsHtml += `</p>`;
    }

    panel.innerHTML = `
        <div class="transaction-ready-icon">
            <i class="fas fa-check-circle"></i>
        </div>

        <div class="transaction-ready-content">
            <strong>Both parties agreed</strong>
            <p>
                Your agreement has been recorded.
                The transaction can now proceed to admin review and verification.
            </p>
            ${meetupDetailsHtml}
            <button type="button" class="reschedule-link-btn" id="rescheduleBtn" style="background:none;border:1px solid #ccc;color:#555;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <i class="fas fa-calendar-xmark"></i> Can't make it? Reschedule
            </button>
        </div>

        <div class="transaction-ready-status">
            <span>2/2 Agreed</span>
            <small>Waiting for admin review</small>
        </div>
    `;

    const agreementBar = document.getElementById("agreementBar");
    if (agreementBar) {
        agreementBar.insertAdjacentElement("afterend", panel);
    } else {
        chatBody.prepend(panel);
    }

    const rescheduleBtn = document.getElementById("rescheduleBtn");
    if (rescheduleBtn) {
        rescheduleBtn.addEventListener("click", openRescheduleModal);
    }
}

function showConfirmedPanel() {
    if (!chatBody) return;

    let panel = document.getElementById("confirmedPanel");
    if (panel) return;

    panel = document.createElement("div");
    panel.id = "confirmedPanel";
    panel.className = "transaction-ready-panel transaction-confirmed-panel";

    const formattedDate = agreementStatus.meetupDate ? formatDetailDate(agreementStatus.meetupDate) : null;
    const formattedTime = agreementStatus.meetupTime ? formatTimeDisplay(agreementStatus.meetupTime) : null;

    let meetupDetailsHtml = "";
    if (agreementStatus.barangay || formattedDate || formattedTime) {
        meetupDetailsHtml = `<p class="transaction-ready-barangay">`;
        if (agreementStatus.barangay) {
            meetupDetailsHtml += `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(agreementStatus.barangay)}`;
        }
        if (formattedDate) {
            meetupDetailsHtml += `${agreementStatus.barangay ? " &middot; " : ""}<i class="fas fa-calendar-alt"></i> ${escapeHtml(formattedDate)}`;
        }
        if (formattedTime) {
            meetupDetailsHtml += ` &middot; <i class="fas fa-clock"></i> ${escapeHtml(formattedTime)}`;
        }
        meetupDetailsHtml += `</p>`;
    }

    const barangayApproved = agreementStatus.status === "barangay_approved";
    const panelTitle = barangayApproved ? "Ready for handover" : "Confirmed by admin, waiting for barangay approval";
    const panelBody = barangayApproved
        ? "The barangay hall approved this schedule. See you at the meetup! Please bring a valid ID."
        : "An admin confirmed your handover and is coordinating with the barangay hall. Please stand by. Your meetup is not final until the barangay approves.";
    const panelBadge = barangayApproved ? "Ready" : "Waiting for Barangay";
    const panelColor = barangayApproved ? "#2e7d32" : "#0369a1";
    const panelIcon = barangayApproved ? "fa-circle-check" : "fa-hourglass-half";

    const reportLinkHtml = agreementStatus.transactionReportPath
        ? `<a href="${escapeAttribute(agreementStatus.transactionReportPath)}" target="_blank" class="view-report-link-btn" style="background:#5D8252;color:white;text-decoration:none;padding:6px 12px;border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">
               <i class="fas fa-file-pdf"></i> View Confirmation Letter
           </a>`
        : "";

    panel.innerHTML = `
        <div class="transaction-ready-icon" style="color:${panelColor};">
            <i class="fas ${panelIcon}"></i>
        </div>

        <div class="transaction-ready-content">
            <strong>${panelTitle}</strong>
            <p>
                ${panelBody}
            </p>
            ${meetupDetailsHtml}
            <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap;">
                ${reportLinkHtml}
                <button type="button" class="reschedule-link-btn" id="rescheduleBtn" style="background:none;border:1px solid #ccc;color:#555;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                    <i class="fas fa-calendar-xmark"></i> Can't make it? Reschedule
                </button>
            </div>
        </div>

        <div class="transaction-ready-status">
            <span style="color:${panelColor};">${panelBadge}</span>
        </div>
    `;

    const agreementBar = document.getElementById("agreementBar");
    if (agreementBar) {
        agreementBar.insertAdjacentElement("afterend", panel);
    } else {
        chatBody.prepend(panel);
    }

    const rescheduleBtn = document.getElementById("rescheduleBtn");
    if (rescheduleBtn) {
        rescheduleBtn.addEventListener("click", openRescheduleModal);
    }
}

function showDisputedPanel() {
    if (!chatBody) return;

    let panel = document.getElementById("disputedPanel");
    if (panel) return;

    panel = document.createElement("div");
    panel.id = "disputedPanel";
    panel.className = "transaction-ready-panel transaction-disputed-panel";

    panel.innerHTML = `
        <div class="transaction-ready-icon" style="color:#b3261e;">
            <i class="fas fa-triangle-exclamation"></i>
        </div>

        <div class="transaction-ready-content">
            <strong>Flagged for review</strong>
            <p>
                An admin flagged this agreement and is looking into it. You'll be notified once it's resolved.
            </p>
        </div>

        <div class="transaction-ready-status">
            <span style="color:#b3261e;">Disputed</span>
        </div>
    `;

    const agreementBar = document.getElementById("agreementBar");
    if (agreementBar) {
        agreementBar.insertAdjacentElement("afterend", panel);
    } else {
        chatBody.prepend(panel);
    }
}

async function notifyAdminAgreementReady() {
    if (!currentConversationId) return;

    try {
        await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/agreement/notify-admin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        });
    } catch (error) {
        console.error("notifyAdminAgreementReady:", error);
    }
}

/* =========================================================
   RESCHEDULE
   ========================================================= */

function createRescheduleModal() {
    if (document.getElementById("rescheduleModal")) return;

    const modal = document.createElement("div");
    modal.id = "rescheduleModal";
    modal.className = "agreement-modal";

    modal.innerHTML = `
        <div class="agreement-modal-content" role="dialog" aria-modal="true">
            <button type="button" id="closeRescheduleModal" class="agreement-modal-close" aria-label="Close">&times;</button>

            <div class="agreement-modal-icon">
                <i class="fas fa-calendar-xmark"></i>
            </div>

            <h2>Reschedule This Meetup?</h2>

            <p class="agreement-modal-text">
                This resets both parties' agreement — you'll both need to agree again, and an admin will re-review before it's confirmed.
            </p>

            <div class="agreement-barangay-box">
                <label for="rescheduleBarangayInput">
                    <i class="fas fa-map-marker-alt"></i> New meetup location (optional — keeps current if left blank)
                </label>
                <select id="rescheduleBarangayInput" class="agreement-barangay-select" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ccc; font-size:14px; margin-top:4px;">
                    <option value="">Keep current location</option>
                    ${buildBarangayOptionsHTML()}
                </select>
            </div>

            <div class="agreement-datetime-box" style="margin-top: 12px; display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label for="rescheduleDateInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">
                        <i class="fas fa-calendar-alt"></i> New Date
                    </label>
                    <input type="date" id="rescheduleDateInput" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label for="rescheduleTimeInput" style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">
                        <i class="fas fa-clock"></i> New Time
                    </label>
                    <input type="time" id="rescheduleTimeInput" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>

            <div class="agreement-barangay-box" style="margin-top: 12px;">
                <label for="rescheduleReasonInput">
                    <i class="fas fa-comment-dots"></i> Reason (optional)
                </label>
                <textarea id="rescheduleReasonInput" rows="2" maxlength="300"
                    style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ccc; font-size:14px; margin-top:4px; font-family:inherit; resize:vertical;"
                    placeholder="e.g. Something came up, can we move to Saturday instead?"></textarea>
            </div>

            <div class="agreement-modal-actions">
                <button type="button" id="cancelRescheduleBtn" class="agreement-cancel-btn">Cancel</button>
                <button type="button" id="submitRescheduleBtn" class="agreement-confirm-btn">
                    <i class="fas fa-calendar-check"></i> Request Reschedule
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeRescheduleModal();
    });

    document.getElementById("closeRescheduleModal")?.addEventListener("click", closeRescheduleModal);
    document.getElementById("cancelRescheduleBtn")?.addEventListener("click", closeRescheduleModal);
    document.getElementById("submitRescheduleBtn")?.addEventListener("click", submitReschedule);
}

function openRescheduleModal() {
    if (!currentConversationId) return;

    const modal = document.getElementById("rescheduleModal");
    if (!modal) return;

    modal.classList.add("show");
    document.body.classList.add("agreement-modal-open");
}

function closeRescheduleModal() {
    const modal = document.getElementById("rescheduleModal");
    if (modal) modal.classList.remove("show");
    document.body.classList.remove("agreement-modal-open");
}

async function submitReschedule() {
    if (!currentConversationId) return;

    const barangayInput = document.getElementById("rescheduleBarangayInput");
    const dateInput = document.getElementById("rescheduleDateInput");
    const timeInput = document.getElementById("rescheduleTimeInput");
    const reasonInput = document.getElementById("rescheduleReasonInput");

    const button = document.getElementById("submitRescheduleBtn");
    if (button) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Requesting...`;
    }

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/reschedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                barangay: barangayInput ? barangayInput.value.trim() : "",
                meetup_date: dateInput ? dateInput.value.trim() : "",
                meetup_time: timeInput ? timeInput.value.trim() : "",
                reason: reasonInput ? reasonInput.value.trim() : ""
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to request a reschedule.");
        }

        closeRescheduleModal();
        removeAgreementPanels();

        agreementStatus.userAgreed = false;
        agreementStatus.otherUserAgreed = false;
        agreementStatus.totalAgreed = 0;
        agreementStatus.status = "reschedule_requested";
        agreementStatus.barangay = data.barangay || agreementStatus.barangay;
        agreementStatus.meetupDate = data.meetupDate || null;
        agreementStatus.meetupTime = data.meetupTime || null;
        agreementStatus.transactionReportPath = null;

        renderAgreementBar();
        showToast("Reschedule requested. Both parties need to agree again.");

        if (typeof loadMessages === "function") {
            loadMessages(currentConversationId);
        }

    } catch (error) {
        console.error("submitReschedule:", error);
        alert(error.message || "Unable to request a reschedule.");
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = `<i class="fas fa-calendar-check"></i> Request Reschedule`;
        }
    }
}

/* =========================================================
   AGREEMENT POLLING
   ========================================================= */

function startAgreementPolling() {
    stopAgreementPolling();

    if (!currentConversationId) return;

    agreementPollingInterval = setInterval(async () => {
        if (document.hidden || !currentConversationId) return;
        await loadAgreementStatus();
    }, AGREEMENT_POLL_INTERVAL);
}

function stopAgreementPolling() {
    if (agreementPollingInterval !== null) {
        clearInterval(agreementPollingInterval);
        agreementPollingInterval = null;
    }
}

/* =========================================================
   SEND MESSAGE
   ========================================================= */

function setupSendMessage() {
    if (!sendBtn || !messageInput) return;

    sendBtn.addEventListener("click", sendMessage);

    messageInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    if (!currentConversationId) {
        alert("Please select or start a conversation first.");
        return;
    }

    if (!messageInput) return;

    const message = messageInput.value.trim();

    if (!message) return;

    if (sendBtn) sendBtn.disabled = true;

    const original = messageInput.value;

    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to send message.");
        }

        messageInput.value = "";
        lastMessageSignature = "";

        await loadMessages(currentConversationId, false);
        await loadConversations({ silent: true });

    } catch (error) {
        console.error("sendMessage:", error);
        messageInput.value = original;
        alert(error.message || "Failed to send message.");

    } finally {
        if (sendBtn) sendBtn.disabled = false;
        messageInput.focus();
    }
}

/* =========================================================
   REVEAL A SENSITIVE PHOTO
   ========================================================= */

async function revealSensitiveImage(messageId, wrapper) {
    wrapper.classList.add("loading");

    try {
        const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reveal-image`, {
            method: "POST",
            headers: { Accept: "application/json" }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            wrapper.classList.remove("loading");

            if (response.status === 403) {
                wrapper.classList.add("exhausted");
                wrapper.innerHTML = `
                    <div class="sensitive-lock-overlay">
                        <i class="fas fa-ban"></i><span>View limit reached</span>
                    </div>
                `;
                showToast(data.message || "View limit reached for this photo.");
                return;
            }

            alert(data.message || "Unable to load this photo.");
            return;
        }

        revealedImageCache.set(messageId, data.imageUrl);

        wrapper.classList.remove("loading");
        wrapper.innerHTML = `
            <img src="${escapeAttribute(data.imageUrl)}" alt="Shared item" class="message-image" loading="lazy" draggable="false" oncontextmenu="return false;">
        `;
        wrapper.classList.add("revealed");

        const newWrapper = wrapper;
        newWrapper.onclick = () => newWrapper.classList.toggle("revealed");

        if (typeof data.remainingViews === "number") {
            showToast(data.remainingViews > 0
                ? `Photo revealed. ${data.remainingViews} view${data.remainingViews === 1 ? "" : "s"} left.`
                : "Photo revealed. This was your last view of it.");
        }

    } catch (error) {
        console.error("revealSensitiveImage:", error);
        wrapper.classList.remove("loading");
        alert("Unable to load this photo.");
    }
}

/* =========================================================
   IMAGE UPLOAD + CONSENT
   ========================================================= */

let pendingImageFile = null;

function createImageConsentModal() {
    if (document.getElementById("imageConsentModal")) return;

    const modal = document.createElement("div");
    modal.id = "imageConsentModal";
    modal.className = "upload-consent-modal";

    modal.innerHTML = `
        <div class="upload-consent-content" role="dialog" aria-modal="true">
            <i class="fas fa-triangle-exclamation upload-consent-icon"></i>
            <h3>Sending a photo</h3>

            <p id="imageConsentDefaultText">
                This photo will be visible to the other person in this chat
                (and to an admin, if this transaction is later reviewed).
            </p>

            <label id="imageSensitiveLabel" style="display:flex; align-items:flex-start; gap:8px; text-align:left; font-size:12.5px; color:#333; margin-bottom:14px; cursor:pointer;">
                <input type="checkbox" id="imageIsSensitive" style="margin-top:2px;">
                <span>This photo shows a valid ID, cash, or other sensitive document</span>
            </label>

            <p id="imageConsentSensitiveText" style="display:none; background:#fff8e1; border:1px solid #f0d78c; border-radius:8px; padding:10px; text-align:left;">
                By continuing, you consent to sharing this ID/sensitive document with the
                other party for verification purposes only. It will be blurred by default
                in the chat and only revealed when tapped. Please make sure any details you
                don't want shared (e.g. full ID number) are covered before sending.
            </p>

            <div class="upload-consent-actions">
                <button type="button" class="consent-cancel-btn" id="imageConsentCancelBtn">Cancel</button>
                <button type="button" class="consent-confirm-btn" id="imageConsentSendBtn">Send Photo</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const checkbox = document.getElementById("imageIsSensitive");
    const sensitiveText = document.getElementById("imageConsentSensitiveText");
    const defaultText = document.getElementById("imageConsentDefaultText");

    checkbox.addEventListener("change", () => {
        sensitiveText.style.display = checkbox.checked ? "block" : "none";
        defaultText.style.display = checkbox.checked ? "none" : "block";
    });

    document.getElementById("imageConsentCancelBtn").addEventListener("click", closeImageConsentModal);
    document.getElementById("imageConsentSendBtn").addEventListener("click", () => {
        const isSensitive = checkbox.checked;
        const file = pendingImageFile;
        closeImageConsentModal();
        if (file) sendImageMessage(file, isSensitive);
    });
}

function openImageConsentModal(file) {
    pendingImageFile = file;

    const modal = document.getElementById("imageConsentModal");
    const checkbox = document.getElementById("imageIsSensitive");
    const sensitiveText = document.getElementById("imageConsentSensitiveText");
    const defaultText = document.getElementById("imageConsentDefaultText");

    if (checkbox) checkbox.checked = false;
    if (sensitiveText) sensitiveText.style.display = "none";
    if (defaultText) defaultText.style.display = "block";

    if (modal) modal.classList.add("open");
}

function closeImageConsentModal() {
    const modal = document.getElementById("imageConsentModal");
    if (modal) modal.classList.remove("open");
    pendingImageFile = null;
    if (chatImageInput) chatImageInput.value = "";
}

function setupImageUpload() {
    if (!attachBtn || !chatImageInput) return;

    attachBtn.addEventListener("click", () => {
        if (!currentConversationId) {
            alert("Please select or start a conversation first.");
            return;
        }
        chatImageInput.click();
    });

    chatImageInput.addEventListener("change", () => {
        const file = chatImageInput.files && chatImageInput.files[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            alert("Only JPG, PNG, or WEBP images are allowed.");
            chatImageInput.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image is too large. Max size is 5MB.");
            chatImageInput.value = "";
            return;
        }

        openImageConsentModal(file);
    });
}

async function sendImageMessage(file, isSensitive) {
    if (!currentConversationId) return;

    if (attachBtn) attachBtn.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("isSensitive", isSensitive ? "1" : "0");

        const response = await fetch(`/api/conversations/${encodeURIComponent(currentConversationId)}/messages`, {
            method: "POST",
            headers: { Accept: "application/json" },
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to send image.");
        }

        lastMessageSignature = "";
        await loadMessages(currentConversationId, false);
        await loadConversations({ silent: true });

    } catch (error) {
        console.error("sendImageMessage:", error);
        alert(error.message || "Failed to send image.");

    } finally {
        if (attachBtn) attachBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (chatImageInput) chatImageInput.value = "";
    }
}

/* =========================================================
   REPORT USER
   ========================================================= */

function setupReportUserButton() {
    if (reportUserBtn) {
        reportUserBtn.addEventListener("click", () => {
            openReportUserModal();
        });
    }
}

function createReportUserModal() {
    if (document.getElementById("reportUserModal")) return;

    const modal = document.createElement("div");
    modal.id = "reportUserModal";
    modal.className = "agreement-modal";

    modal.innerHTML = `
        <div class="agreement-modal-content" role="dialog" aria-modal="true">
            <button type="button" id="closeReportUserModal" class="agreement-modal-close" aria-label="Close">&times;</button>

            <div class="agreement-modal-header">
                <i class="fas fa-flag" style="color:#d9534f;"></i>
                <h2>Report User</h2>
                <p id="reportUserTargetText">Tell us what happened. Reports are sent to ReFoundly admins for review.</p>
            </div>

            <div style="text-align:left; margin-bottom:12px;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px;">Reason</label>
                <select id="reportReason" style="width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; background:white;">
                    <option value="">Select a reason...</option>
                    <option value="scam">Scam or fraud attempt</option>
                    <option value="harassment">Harassment or abusive behavior</option>
                    <option value="fake_item">Fake or misleading item claim</option>
                    <option value="no_show">Didn't show up / broke the agreement</option>
                    <option value="other">Other</option>
                </select>
            </div>

            <div style="text-align:left; margin-bottom:6px;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px;">Additional details (optional)</label>
                <textarea id="reportDetails" maxlength="500" rows="4" placeholder="Add anything that can help admins review this report..." style="width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; resize:vertical; font-family:inherit;"></textarea>
            </div>

            <p id="reportUserError" style="display:none; color:#d9534f; font-size:12px; margin:4px 0 0; text-align:left;"></p>

            <div class="agreement-modal-actions">
                <button type="button" class="agreement-cancel-btn" id="cancelReportUserBtn">Cancel</button>
                <button type="button" class="agreement-confirm-btn" id="submitReportUserBtn">Submit Report</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeReportUserModal").addEventListener("click", closeReportUserModal);
    document.getElementById("cancelReportUserBtn").addEventListener("click", closeReportUserModal);
    document.getElementById("submitReportUserBtn").addEventListener("click", submitUserReport);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeReportUserModal();
    });
}

function openReportUserModal() {
    if (!currentConversation || !currentConversation.other_user_id) {
        showToast("Open a conversation first to report this user.");
        return;
    }

    const modal = document.getElementById("reportUserModal");
    if (!modal) return;

    const targetText = document.getElementById("reportUserTargetText");
    const otherName = currentConversation.other_user_name || currentConversation.other_user_email || "this user";
    if (targetText) {
        targetText.textContent = `Reporting ${otherName}. This is sent to ReFoundly admins for review.`;
    }

    const reasonSelect = document.getElementById("reportReason");
    const detailsField = document.getElementById("reportDetails");
    const errorText = document.getElementById("reportUserError");

    if (reasonSelect) reasonSelect.value = "";
    if (detailsField) detailsField.value = "";
    if (errorText) {
        errorText.style.display = "none";
        errorText.textContent = "";
    }

    modal.classList.add("show");
    document.body.classList.add("agreement-modal-open");
}

function closeReportUserModal() {
    const modal = document.getElementById("reportUserModal");
    if (modal) modal.classList.remove("show");
    document.body.classList.remove("agreement-modal-open");
}

async function submitUserReport() {
    const reasonSelect = document.getElementById("reportReason");
    const detailsField = document.getElementById("reportDetails");
    const errorText = document.getElementById("reportUserError");
    const submitBtn = document.getElementById("submitReportUserBtn");

    const reason = reasonSelect ? reasonSelect.value : "";
    const details = detailsField ? detailsField.value.trim() : "";

    if (!reason) {
        if (errorText) {
            errorText.textContent = "Please select a reason for this report.";
            errorText.style.display = "block";
        }
        return;
    }

    if (!currentConversation || !currentConversation.other_user_id) {
        closeReportUserModal();
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
    }

    try {
        const response = await fetch(`/api/users/${encodeURIComponent(currentConversation.other_user_id)}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                conversationId: currentConversationId,
                reason,
                details
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to submit report.");
        }

        closeReportUserModal();
        showToast(data.message || "Report submitted. Our team will review it shortly.");

    } catch (error) {
        console.error("submitUserReport:", error);
        if (errorText) {
            errorText.textContent = error.message || "Failed to submit report. Please try again.";
            errorText.style.display = "block";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Report";
        }
    }
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
    if (!chatSearch) return;

    chatSearch.addEventListener("input", () => {
        const search = chatSearch.value.trim().toLowerCase();

        if (!search) {
            renderConversationList(conversations);
            return;
        }

        const filtered = conversations.filter(conversation => {
            const name = String(conversation.other_user_name || "").toLowerCase();
            const email = String(conversation.other_user_email || "").toLowerCase();
            const item = String(conversation.item_name || "").toLowerCase();

            return name.includes(search) || email.includes(search) || item.includes(search);
        });

        renderConversationList(filtered);
    });
}

/* =========================================================
   ITEM DETAILS
   ========================================================= */

function createItemDetailsModal() {
    if (document.getElementById("itemDetailsModal")) return;

    const overlay = document.createElement("div");
    overlay.id = "itemDetailsModal";
    overlay.className = "item-details-modal-overlay";

    overlay.innerHTML = `
        <div class="item-details-modal" role="dialog" aria-modal="true">
            <button type="button" id="closeItemDetailsModal" class="item-details-close" aria-label="Close">&times;</button>

            <div class="item-details-header">
                <div class="item-details-header-icon">
                    <i class="fas fa-box-open"></i>
                </div>
                <div>
                    <h2>Item Details</h2>
                    <p>Review the item information before agreeing.</p>
                </div>
            </div>

            <div id="itemDetailsContent" class="item-details-content">
                <div class="item-details-loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading item details...
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeItemDetailsModal();
        }
    });
}

function setupItemDetailsEvents() {
    document.addEventListener("click", event => {
        if (event.target.closest("#viewItemDetailsBtn")) {
            openItemDetailsModal();
        }

        if (event.target.closest("#closeItemDetailsModal")) {
            closeItemDetailsModal();
        }
    });
}

async function openItemDetailsModal() {
    const modal = document.getElementById("itemDetailsModal");
    const content = document.getElementById("itemDetailsContent");

    if (!modal) return;

    modal.classList.add("show");
    document.body.classList.add("item-details-modal-open");

    if (content) {
        content.innerHTML = `
            <div class="item-details-loading">
                <i class="fas fa-spinner fa-spin"></i> Loading item details...
            </div>
        `;
    }

    try {
        const item = await getItemDetails();
        renderItemDetails(item);
    } catch (error) {
        console.error("openItemDetailsModal:", error);
        renderItemDetails(currentConversation || {});
    }
}

function closeItemDetailsModal() {
    const modal = document.getElementById("itemDetailsModal");

    if (modal) {
        modal.classList.remove("show");
    }

    document.body.classList.remove("item-details-modal-open");
}

async function getItemDetails() {
    if (itemDetailsCache) {
        return itemDetailsCache;
    }

    const conversation = currentConversation || {};
    const itemId = conversation.item_id || conversation.itemId;

    if (itemId) {
        const endpoints = [
            `/api/items/${itemId}`,
            `/api/items/${itemId}/details`,
            `/api/item/${itemId}`,
            `/api/item/${itemId}/details`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: { Accept: "application/json" },
                    cache: "no-store"
                });

                if (!response.ok) continue;

                const data = await response.json();
                const itemObj = data.item || data.data || (data.id || data.item_name || data.name ? data : null);

                if (itemObj) {
                    itemDetailsCache = {
                        ...conversation,
                        ...itemObj
                    };
                    return itemDetailsCache;
                }

            } catch (error) {
                console.warn("Item endpoint failed:", endpoint, error);
            }
        }
    }

    itemDetailsCache = conversation;
    return itemDetailsCache;
}

function renderItemDetails(item) {
    const content = document.getElementById("itemDetailsContent");
    if (!content) return;

    const name = firstValue(item, ["item_name", "name", "title"], "Unknown Item");
    const description = firstValue(item, ["item_description", "description", "details"], "No description provided.");
    const category = firstValue(item, ["item_category", "category", "category_name"], "Not specified");
    const location = firstValue(item, ["item_location", "location", "found_location", "lost_location"], "Not specified");
    const status = firstValue(item, ["status", "item_status"], "Not specified");
    const date = firstValue(item, ["created_at", "date_reported", "reported_at", "date", "incident_date", "item_date"], "");
    const image = firstValue(item, ["image_url", "image_path", "item_image", "image", "photo_url", "photo"], "");
    const type = firstValue(item, ["type", "item_type", "report_type"], "Not specified");
    const reference = firstValue(item, ["item_id", "id"], "");

    content.innerHTML = `
        ${image
            ? `<div class="item-details-image-wrapper">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(name)}" class="item-details-image">
               </div>`
            : `<div class="item-details-no-image">
                    <i class="fas fa-image"></i>
                    <span>No image available</span>
               </div>`
        }

        <div class="item-details-title">
            <span>Item</span>
            <h3>${escapeHtml(name)}</h3>
        </div>

        <div class="item-details-grid">
            ${createDetailRow("Category", category, "fa-tag")}
            ${createDetailRow("Type", type, "fa-clipboard-list")}
            ${createDetailRow("Location", location, "fa-location-dot")}
            ${createDetailRow("Status", status, "fa-circle-info")}
            ${date ? createDetailRow("Date Reported", formatDetailDate(date), "fa-calendar") : ""}
            ${reference ? createDetailRow("Reference ID", reference, "fa-hashtag") : ""}
        </div>

        <div class="item-details-description">
            <h4><i class="fas fa-align-left"></i> Description</h4>
            <p>${escapeHtml(description)}</p>
        </div>
    `;
}

function createDetailRow(label, value, icon) {
    return `
        <div class="item-detail-row">
            <div class="item-detail-label">
                <i class="fas ${icon}"></i>
                <span>${escapeHtml(label)}</span>
            </div>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

function firstValue(object, keys, fallback = "") {
    if (!object) return fallback;

    for (const key of keys) {
        const value = object[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }

    return fallback;
}

function formatDetailDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatTimeDisplay(timeStr) {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    if (hours === undefined || minutes === undefined) return timeStr;
    let h = parseInt(hours, 10);
    const m = minutes.padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function showEmptyState(customMessage = null) {
    stopMessagePolling();
    stopAgreementPolling();

    currentConversationId = null;
    currentConversation = null;
    currentMessages = [];

    itemDetailsCache = null;
    lastMessageSignature = "";

    resetAgreementStatus();
    closeAgreementModal();
    closeItemDetailsModal();
    closeReportUserModal();

    // Hide mobile chat view and return to inbox list
    const wrapper = document.querySelector(".messaging-wrapper");
    if (wrapper) wrapper.classList.remove("mobile-chat-active");

    if (currentUserName) {
        currentUserName.textContent = "Select a conversation";
    }

    if (currentItemName) {
        currentItemName.textContent = "";
    }

    if (chatHeaderActions) chatHeaderActions.style.display = "none";

    renderItemFloatingCard();

    if (chatFooter) {
        chatFooter.style.display = "none";
    }

    if (chatBody) {
        chatBody.innerHTML = `
            <div class="conversation-start">
                <i class="fas fa-comments"></i>
                <h3>${customMessage || "Select a conversation"}</h3>
                <p>${customMessage ? "" : "Select a conversation to start chatting."}</p>
            </div>
        `;
    }

    renderConversationList(conversations);
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
    let toast = document.getElementById("messageToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "messageToast";
        toast.className = "message-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

function formatMessageTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function isChatNearBottom() {
    if (!chatBody) return true;

    const distance = chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight;
    return distance <= 100;
}

function scrollChatToBottom() {
    if (!chatBody) return;

    requestAnimationFrame(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    });
}

document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !currentConversationId) return;

    lastMessageSignature = "";

    await loadMessages(currentConversationId, false);
    await loadAgreementStatus();
    await loadConversations({ silent: true });
});

window.addEventListener("beforeunload", () => {
    stopMessagePolling();
    stopConversationListPolling();
    stopAgreementPolling();
});