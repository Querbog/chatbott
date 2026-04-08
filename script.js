// --- Configuration ---
const API_KEY = 'AIzaSyClWAwTPVXZLfCwVEXOd5iSSTK6yWDqw50';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`;

const packageDatabase = {
    'PKG-12345678': { status: 'delivered', date: 'Yesterday, 3:45 PM', location: 'Porch' },
    'PKG-11111111': { status: 'delayed', eta: 'April 12, 2026', reason: 'Heavy Snow' },
    'PKG-00000000': { status: 'lost', details: 'Signal lost at sorting facility' }
};

const SYSTEM_PROMPT = `
You are "Support ChatBot", a high-fidelity AI assistant. 
Your tone is enterprise-grade, efficient, and precise.
You handle: Tracking Lost Packages, Product Recommendations, and Tech Support.

CONTEXT:
- Tracking database: ${JSON.stringify(packageDatabase)}
- If a package is 'delivered' but missing, suggest checking a 50-meter perimeter.
- Laptops: Suggest EliteBook (High), ProBook (Mid), or Flex (Budget).
- Phone Plans: 'Unlimited Ultra' ($80) or 'Starter Sync' ($30).

FORMATTING:
- Keep responses concise.
- Avoid using markdown bold (**) or other markers.
- Provide 2 short options for quick replies in this format: [SUGGESTIONS: Option 1, Option 2]
`;

// --- State ---
let chatHistory = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: "Hello. Welcome to Support. How can I assist you?" }] }
];

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const quickReplies = document.getElementById('quick-replies');

// --- Helper Functions ---

function scrollToBottom() {
    setTimeout(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, sender = 'bot') {
    const time = getCurrentTime();
    const msgWrapper = document.createElement('div');

    if (sender === 'bot') {
        msgWrapper.className = "flex flex-col items-start w-full";
        msgWrapper.innerHTML = `
            <div class="flex items-center space-x-3 mb-2">
                <div class="w-6 h-6 rounded bg-secondary flex items-center justify-center text-[10px] text-white font-bold">AI</div>
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${time}</span>
            </div>
            <div class="bot-bubble bg-white border border-slate-100 p-5 text-[#0F172A] leading-relaxed shadow-sm max-w-[85%] md:max-w-2xl">
                <p class="font-body text-sm whitespace-pre-wrap">${text}</p>
            </div>
        `;
    } else {
        msgWrapper.className = "flex flex-col items-end w-full";
        msgWrapper.innerHTML = `
            <div class="flex items-center space-x-3 mb-2 justify-end">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${time}</span>
                <div class="w-6 h-6 rounded bg-primary flex items-center justify-center text-[10px] text-white font-bold">JD</div>
            </div>
            <div class="user-bubble bg-[#f0f4f7] border border-slate-200 p-5 text-[#0F172A] leading-relaxed shadow-sm max-w-[85%] md:max-w-2xl">
                <p class="font-body text-sm whitespace-pre-wrap">${text}</p>
            </div>
        `;
    }

    chatMessages.appendChild(msgWrapper);
    scrollToBottom();
    return msgWrapper;
}

function showTyping() {
    const time = getCurrentTime();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'flex flex-col items-start w-full';
    typingDiv.innerHTML = `
        <div class="flex items-center space-x-3 mb-2">
            <div class="w-6 h-6 rounded bg-secondary flex items-center justify-center text-[10px] text-white font-bold">AI</div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${time}</span>
        </div>
        <div class="bot-bubble bg-white border border-slate-100 p-5 text-[#0F172A] shadow-sm italic text-xs text-slate-400">
            Thinking...
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

function parseAndSetSuggestions(text) {
    const regex = /\[SUGGESTIONS: (.*?)\]/;
    const match = text.match(regex);
    let suggestions = [];
    let cleanText = text;

    if (match) {
        suggestions = match[1].split(',').map(s => s.trim());
        cleanText = text.replace(regex, '').trim();
    }

    quickReplies.innerHTML = '';
    suggestions.forEach(label => {
        const btn = document.createElement('button');
        btn.className = "px-4 py-2 rounded-full border border-slate-200 bg-white text-[#0F172A] font-bold text-xs hover:border-primary hover:text-primary transition-all flex items-center space-x-2 shadow-sm";
        btn.innerHTML = `<span>${label}</span>`;
        btn.onclick = () => handleUserInput(label);
        quickReplies.appendChild(btn);
    });

    return cleanText;
}

async function callGemini(userText) {
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistory })
        });

        const data = await response.json();
        const botText = data.candidates[0].content.parts[0].text;

        chatHistory.push({ role: 'model', parts: [{ text: botText }] });
        return botText;
    } catch (error) {
        console.error("AI Error:", error);
        return "System timeout. Please verify your connection. [SUGGESTIONS: Retry Support, Reset Session]";
    }
}

// --- Main Interactions ---

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
    }
});

sendBtn.onclick = sendMsg;

async function sendMsg() {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    // Auto-reset height
    userInput.style.height = '44px';
    await handleUserInput(text);
}

async function handleUserInput(text) {
    if (text.toLowerCase().includes('reset session')) {
        location.reload();
        return;
    }

    addMessage(text, 'user');
    quickReplies.innerHTML = '';

    const typing = showTyping();
    const aiResponse = await callGemini(text);
    typing.remove();

    const cleanResponse = parseAndSetSuggestions(aiResponse).replace(/\*\*/g, '');
    addMessage(cleanResponse, 'bot');
}

// --- Initialization ---
window.onload = () => {
    const initialGreeting = chatHistory[1].parts[0].text;
    addMessage(initialGreeting, 'bot');

    // Initial dynamic suggestions
    const btnContainer = document.createElement('div');
    btnContainer.className = "flex flex-wrap gap-2 mt-4";
    quickReplies.appendChild(btnContainer);
};
