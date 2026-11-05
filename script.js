// --- CALCULADORA ---
let calcExpression = "";

function updateDisplay() {
    let display = document.getElementById('calc-display');
    if (display) {
        display.innerText = calcExpression === "" ? "0" : calcExpression;
    }
}

function calcInput(val) {
    if (calcExpression === "0") calcExpression = "";
    calcExpression += val;
    updateDisplay();
}

function clearCalc() {
    calcExpression = "";
    updateDisplay();
}

function backspaceCalc() {
    calcExpression = calcExpression.slice(0, -1);
    updateDisplay();
}

function calculateResult() {
    try {
        let exp = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        let res = eval(exp);
        calcExpression = String(res);
        updateDisplay();
    } catch (e) {
        let display = document.getElementById('calc-display');
        if (display) display.innerText = "Erro";
        calcExpression = "";
    }
}

// --- GOOGLE ---
function openGoogleModal() {
    let q = document.getElementById('search-query').value.trim();
    if (q !== "") {
        window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    }
}

// --- IA ASSISTENTE ---
function sendAIMessage() {
    let input = document.getElementById('ai-input');
    let chatBox = document.getElementById('chat-box');
    let text = input.value.trim();

    if (text === "") return;

    let userMsg = document.createElement('div');
    userMsg.className = 'msg-user';
    userMsg.innerText = text;
    chatBox.appendChild(userMsg);

    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    setTimeout(function() {
        let aiMsg = document.createElement('div');
        aiMsg.className = 'msg-ai';
        aiMsg.innerHTML = getAIResponse(text);
        chatBox.appendChild(aiMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 400);
}

function getAIResponse(prompt) {
    let p = prompt.toLowerCase();

    if (p.includes('scratch') || p.includes('jogo') || p.includes('godot')) {
        return "Desenvolvimento de jogos é ótimo! Posso te ajudar a planejar mecânicas, lógica de blocos ou scripts de movimentação.";
    }
    if (p.includes('oi') || p.includes('olá')) {
        return "Olá! O que vamos pesquisar ou calcular agora?";
    }
    if (p.includes('guerra fria')) {
        return "A Guerra Fria (1947-1991) foi um período de disputa política e tecnológica entre os EUA e a União Soviética sem confronto direto entre eles.";
    }
    return "Entendi! Posso te ajudar com dúvidas de programação, ideias para o site ou cálculos.";
}
