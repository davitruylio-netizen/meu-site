// Navegação entre Apps
function openApp(appId) {
    document.getElementById(appId).classList.add('active');
}

function closeApp(appId) {
    document.getElementById(appId).classList.remove('active');
}

// Lógica do Google
function searchGoogle() {
    const query = document.getElementById('search-query').value;
    if (query.trim() !== "") {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
}

// Lógica da Calculadora
let calcDisplay = document.getElementById('calc-display');

function calcInput(val) {
    calcDisplay.value += val;
}

function clearCalc() {
    calcDisplay.value = '';
}

function calculateResult() {
    try {
        calcDisplay.value = eval(calcDisplay.value);
    } catch {
        calcDisplay.value = 'Erro';
    }
}

// Lógica da Assistente IA
function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const text = input.value.trim();

    if (text === "") return;

    // Mensagem do Usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'msg-user';
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);

    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Resposta Simulada da IA
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'msg-ai';
        aiMsg.textContent = getAIResponse(text);
        chatBox.appendChild(aiMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 600);
}

function getAIResponse(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('ideia') || p.includes('ideias')) {
        return "Que tal criarmos um app de notas ou um player de música no nosso celular?";
    } else if (p.includes('oi') || p.includes('olá')) {
        return "Olá! O que vamos construir juntos agora?";
    } else if (p.includes('horas') || p.includes('dia')) {
        return "Você pode conferir a hora direto no topo do seu celular real!";
    } else {
        return `Entendi! Vamos adicionar essa ideia ao nosso projeto em breve.`;
    }
}

