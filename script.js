// --- LÓGICA DA CALCULADORA ---
let calcExpression = "";

function updateDisplay() {
    const display = document.getElementById('calc-display');
    display.textContent = calcExpression === "" ? "0" : calcExpression;
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
        // Substitui caracteres visuais por operadores matemáticos válidos
        let exp = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        let result = eval(exp);
        calcExpression = String(result);
        updateDisplay();
    } catch (e) {
        document.getElementById('calc-display').textContent = "Erro";
        calcExpression = "";
    }
}

// --- LÓGICA DA PESQUISA EM JANELA MODAL ---
function openGoogleModal() {
    const query = document.getElementById('search-query').value.trim();
    if (!query) return;

    const modal = document.getElementById('google-modal');
    const iframe = document.getElementById('google-frame');
    const title = document.getElementById('modal-title');

    title.textContent = `Pesquisa: "${query}"`;
    // Usa o mecanismo do Bing/Google embutido para permitir carregamento dentro de iFrames
    iframe.src = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    modal.style.display = 'flex';
}

function closeGoogleModal() {
    const modal = document.getElementById('google-modal');
    const iframe = document.getElementById('google-frame');
    modal.style.display = 'none';
    iframe.src = '';
}

// --- LÓGICA DA ASSISTENTE IA ---
function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const text = input.value.trim();

    if (text === "") return;

    // Adiciona mensagem do usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'msg-user';
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);

    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Resposta inteligente da IA
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'msg-ai';
        aiMsg.innerHTML = processAIQuery(text);
        chatBox.appendChild(aiMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);
}

function processAIQuery(query) {
    const q = query.toLowerCase();

    // Avalia expressões matemáticas enviadas no chat da IA
    if (/^[0-9+\-*/().\s]+$/.test(q.replace(/quanto é|calcula|quanto da/g, '').trim())) {
        try {
            const cleanExp = q.replace(/quanto é|calcula|quanto da/g, '').trim();
            const res = eval(cleanExp);
            return `O resultado de <b>${cleanExp}</b> é <b>${res}</b>.`;
        } catch(e) {}
    }

    if (q.includes('oi') || q.includes('olá') || q.includes('fala')) {
        return "Olá! Como posso te ajudar hoje no nosso painel de ferramentas?";
    }
    if (q.includes('ideia') || q.includes('projeto') || q.includes('criar')) {
        return "Podemos adicionar várias coisas legais aqui: um bloco de notas com salvamento local, uma lista de tarefas, um conversor de moedas ou um player de música!";
    }
    if (q.includes('ajuda') || q.includes('como funciona')) {
        return "Você pode usar a calculadora à esquerda, fazer pesquisas web no campo ao meio e conversar comigo aqui!";
    }
    if (q.includes('scratch') || q.includes('jogo') || q.includes('godot')) {
        return "Desenvolvimento de jogos é excelente! Posso te ajudar com lógica de movimentação, colisão, pontuação e animações de sprites.";
    }

    return `Entendi a sua dúvida sobre "<i>${query}</i>"! Posso ajudar você a desenvolver mais essa ideia ou adicionar novas funções ao nosso código.`;
}
