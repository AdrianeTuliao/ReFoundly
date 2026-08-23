const iconSend = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
const iconBot = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
const iconClose = `<svg viewBox="0 0 24 24" style="width:24px; fill:white;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
const iconChat = `<svg viewBox="0 0 24 24" style="width:30px; fill:white;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

/* ReFoundly Chatbot - Brand Corrected UI */

// Helper function to get greeting based on time
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

const chatbotHTML = `
    <div id="chatbot-container" style="display: none; flex-direction: column; background: white; border-radius: 12px; position: fixed; z-index: 3000; box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; font-family: sans-serif;">
        
        <div class="chat-header-modern" style="background: linear-gradient(90deg, #5D8252 0%, #7B9672 50%, #A2B499 100%); color: white; padding: 12px 15px; display: flex; align-items: center; justify-content: flex-start; position: relative; flex-shrink: 0;">
            <div class="agent-profiles" style="text-align: left;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 600;">ReFoundly Assistant</h3>
            </div>
            <button onclick="toggleChat()" style="position:absolute; top:50%; right:15px; transform: translateY(-50%); background:none; border:none; color:white; cursor:pointer; font-size:18px;">✕</button>
        </div>
        
        <div id="chat-messages" style="flex: 1; padding: 12px 10px; overflow-y: auto; background: #f9fbfd; display: flex; flex-direction: column; gap: 8px;">
            <div class="msg-row bot-row" style="display: flex; align-items: flex-start; gap: 6px;">
                <div class="bot-icon" style="background: #5D8252; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; margin-top: 2px; border: 1px solid #ddd;">
                    <img src="wht_logo.png" alt="Bot" style="width: 25px; height: auto;">
                </div>
                <div class="msg bot-msg" style="background: white; color: #1e293b; padding: 6px 10px; border-radius: 4px 12px 12px 12px; font-size: 11.5px; max-width: 75%; line-height: 1.3; border: 1px solid #eee;">
                    ${getTimeGreeting()}! How can I assist you today?
                </div>
            </div>
        </div>

        <div class="quick-replies" style="display: flex; gap: 5px; padding: 8px 10px; overflow-x: auto; background: #f9fbfd; flex-shrink: 0;">
            <button class="reply-btn" onclick="quickSend('How to report')" style="border: 1px solid #5D8252; color: #5D8252; background: white; border-radius: 15px; padding: 4px 10px; font-size: 11px; cursor: pointer; white-space: nowrap;">Report Item</button>
            <button class="reply-btn" onclick="quickSend('I lost an item')" style="border: 1px solid #5D8252; color: #5D8252; background: white; border-radius: 15px; padding: 4px 10px; font-size: 11px; cursor: pointer; white-space: nowrap;">Lost item</button>
            <button class="reply-btn" onclick="quickSend('I can't find my item')" style="border: 1px solid #5D8252; color: #5D8252; background: white; border-radius: 15px; padding: 4px 10px; font-size: 11px; cursor: pointer; white-space: nowrap;">Find Item</button>
        </div>

        <div class="modern-input-area" style="padding: 10px; display: flex; gap: 8px; background: white; border-top: 1px solid #eee; flex-shrink: 0;">
            <input type="text" id="userInput" placeholder="Type a message..." style="flex: 1; border: none; outline: none; font-size: 12px;">
            <button id="sendBtn" style="background: #5D8252; color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center;">➤</button>
        </div>
    </div>
    
    <button id="chatbot-launcher" onclick="toggleChat()" style="width: 50px; height: 50px; border-radius: 50%; background-color: #5D8252; position: fixed; bottom: 20px; right: 20px; display: flex; align-items: center; justify-content: center; z-index: 2000; cursor: grab; border: none; box-shadow: 0 4px 15px rgba(93, 130, 82, 0.4);">
         <img src="wht_logo.png" alt="Logo" style="width: 45px; height: auto;">
    </button>
`;

document.body.insertAdjacentHTML('beforeend', chatbotHTML);

const launcher = document.getElementById('chatbot-launcher');
const container = document.getElementById('chatbot-container');
const box = document.getElementById('chat-messages');

// Adjusted configuration to match the CSS width/height
const CHAT_HEIGHT = 420;
const CHAT_WIDTH = 310;
let isDragging = false;

// Launcher Dragging Logic (Boundary checked)
launcher.addEventListener('mousedown', (e) => {
    isDragging = false;
    let startX = e.clientX, startY = e.clientY;
    const rectL = launcher.getBoundingClientRect();
    const offsetLX = startX - rectL.left;
    const offsetLY = startY - rectL.top;

    const move = (me) => {
        if (Math.abs(me.clientX - startX) > 5 || Math.abs(me.clientY - startY) > 5) {
            isDragging = true;
            let nTop = Math.max(10, Math.min(window.innerHeight - 70, me.clientY - offsetLY));
            let nLeft = Math.max(10, Math.min(window.innerWidth - 70, me.clientX - offsetLX));
            launcher.style.left = nLeft + 'px';
            launcher.style.top = nTop + 'px';
            launcher.style.bottom = 'auto'; launcher.style.right = 'auto';
            if (container.style.display === 'flex') updateContainerPos(nLeft, nTop);
        }
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
});

function updateContainerPos(lLeft, lTop) {
    let cTop = Math.max(10, Math.min(window.innerHeight - CHAT_HEIGHT - 20, lTop - (CHAT_HEIGHT/2) + 30));
    let cLeft = (lLeft > window.innerWidth / 2) ? lLeft - CHAT_WIDTH - 20 : lLeft + 80;
    container.style.left = cLeft + 'px';
    container.style.top = cTop + 'px';
    container.style.bottom = 'auto'; container.style.right = 'auto';
}

function toggleChat() {
    if (isDragging) return;
    const isOpen = container.style.display === 'flex';
    container.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) updateContainerPos(launcher.offsetLeft, launcher.offsetTop);
}

function quickSend(text) {
    document.getElementById('userInput').value = text;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    //Add for AI Track Testing: Start Timer- start = time.time()
    const startTime = performance.now()

    // User Message: Now Green to match Brand
    box.insertAdjacentHTML('beforeend', `
        <div class="msg-row user-row" style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
            <div class="msg user-msg" style="background: #5D8252; color: white; padding: 6px 10px; border-radius: 12px 12px 4px 12px; font-size: 11.5px; max-width: 75%; line-height: 1.3;">
                ${text}
            </div>
        </div>`);
    
    input.value = '';
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: text})
        });
        const data = await res.json();
        
        // Bot Reply: White with Logo (Matched sizes)
        box.insertAdjacentHTML('beforeend', `
            <div class="msg-row bot-row" style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px;">
                <div class="bot-icon" style="background: #5D8252; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; margin-top: 2px; border: 1px solid #ddd;">
                    <img src="wht_logo.png" alt="Bot" style="width: 25px; height: auto;">
                </div>
                <div class="msg bot-msg" style="background: white; color: #1e293b; padding: 6px 10px; border-radius: 4px 12px 12px 12px; font-size: 11.5px; max-width: 75%; line-height: 1.3; border: 1px solid #eee;">
                    ${data.response}
                </div>
            </div>`);
    } catch {
        box.insertAdjacentHTML('beforeend', `<div class="msg-row bot-row" style="display:flex; justify-content:center;"><div class="msg" style="font-size:10px; color:red;">Connection Error</div></div>`);
    }

    // Added for AI Track: End Timer- end = time.time()
    const endTime = performance.now()
    const durationInSeconds = ((endTime- startTime) / 1000).toFixed(3);
    console.log(`AI Track - Execution Time: ${durationInSeconds} seconds`);

    box.scrollTop = box.scrollHeight;
}

document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('userInput').onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };