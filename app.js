import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 📌 1. CONSTANTES E UTILITÁRIOS BASE
window.listaTodasDocas = ['Doca - (04N/06N)', 'Doca - 1 F2 (7S)', 'Doca - 2 F2 (7S)', 'Doca - Basico F2 (5S)', 'Doca - Basico F3 (CS1)', 'Doca - Inflamáveis'];

window.slotsDia24h = [];
for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
        window.slotsDia24h.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}

window.obterDataHojePtBR = function() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${hoje.getFullYear()}`;
};

window.obterDataHojeISO = function() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
};

window.normalizarTexto = function(txt) {
    return String(txt || '').toLowerCase().replace(/\s+/g, '').trim();
};

window.horaParaMinutos = function(horaStr) {
    if (!horaStr || horaStr === '---' || horaStr === 'IMEDIATO') return 0;
    const partes = String(horaStr).trim().split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1] || 0, 10);
};

window.limparNomeFornecedor = function(nome) {
    let str = String(nome || '').trim().toUpperCase();
    if (!str) return 'FORNECEDOR';
    str = str.replace(/\s*-\s*CONFIRME\s+O\s+AGENDAMENTO.*/i, '');
    str = str.replace(/\s*-\s*CONFIRMAR.*/i, '');
    str = str.replace(/\/BRINDEC\/WELOZE.*/i, '');
    if (!str.match(/^5\s+ESTRELAS/i)) {
        str = str.replace(/[\s\-_]*\d+$/, '').trim();
    }
    return str.trim() || 'FORNECEDOR';
};

window.normalizarDataUniversal = function(dVal) {
    if (!dVal) return window.obterDataHojePtBR();
    const num = Number(dVal);
    if (!isNaN(num) && num > 30000) {
        const dateObj = XLSX.SSF.parse_date_code(num);
        if (dateObj) {
            return `${String(dateObj.d).padStart(2, '0')}/${String(dateObj.m).padStart(2, '0')}/${dateObj.y}`;
        }
    }
    let dStr = String(dVal).trim();
    if (dStr.includes('-')) {
        const p = dStr.split('T')[0].split('-');
        if (p.length === 3) return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0].length === 2 ? '20' + p[0] : p[0]}`;
    }
    if (dStr.includes('/')) {
        const p = dStr.split('/');
        if (p.length === 3) {
            let n1 = parseInt(p[0], 10), n2 = parseInt(p[1], 10), y = p[2].trim();
            if (y.length === 2) y = "20" + y;
            if (n1 <= 12 && n2 > 12) return `${String(n2).padStart(2, '0')}/${String(n1).padStart(2, '0')}/${y}`;
            return `${String(n1).padStart(2, '0')}/${String(n2).padStart(2, '0')}/${y}`;
        }
    }
    return dStr;
};

window.normalizarDataParaISO = function(dVal) {
    const br = window.normalizarDataUniversal(dVal);
    const p = br.split('/');
    if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    return window.obterDataHojeISO();
};

window.dataEhPassada = function(dataStr) {
    if (!dataStr) return false;
    let ano, mes, dia;
    if (dataStr.includes('/')) {
        const p = dataStr.split('/');
        dia = parseInt(p[0], 10); mes = parseInt(p[1], 10) - 1; ano = parseInt(p[2], 10);
    } else if (dataStr.includes('-')) {
        const p = dataStr.split('-');
        ano = parseInt(p[0], 10); mes = parseInt(p[1], 10) - 1; dia = parseInt(p[2], 10);
    } else return false;
    const dt = new Date(ano, mes, dia);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return dt < hoje;
};

// FIREBASE INIT
const firebaseConfig = {
    apiKey: "AIzaSyCljoMUprqBfj9k8y0w7dE3MW7bWdjZlgA",
    authDomain: "yms-patio-6ba8c.firebaseapp.com",
    databaseURL: "https://yms-patio-6ba8c-default-rtdb.firebaseio.com",
    projectId: "yms-patio-6ba8c",
    storageBucket: "yms-patio-6ba8c.firebasestorage.app",
    messagingSenderId: "789675229632",
    appId: "1:789675229632:web:b209d3dc57b702c8710825"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.ymsStore = {
    agendamentos: [], rascunhoAgendamentos: [], ordemAtivaFornecedor: null,
    abaFornecedorAtual: "pendentes", ticketAtivoFiscal: null, ticketAtivoCheckout: null,
    sequenciaDocasSelecao: [], baseMotoristas: [], baseUsuariosCustom: [],
    configApi: { ativo: "NAO", tipo: "whatsapp_zapi", urlEndpoint: "", authToken: "" },
    usuarioLogado: null, empresaFornecedorLogada: null, perfilSolicitadoTemp: null
};

window.mapaCredenciaisFornecedores = [];
window.tipoCargaAtivo = 'cotidiano';

function inicializarEscutadoresFirebase() {
    onValue(ref(db, 'yms_agendamentos_oficiais'), (snapshot) => {
        const data = snapshot.val();
        window.ymsStore.agendamentos = data ? (Array.isArray(data) ? data : Object.values(data)).map(item => ({
            ...item, fornecedor: window.limparNomeFornecedor(item.fornecedor), data: window.normalizarDataUniversal(item.data)
        })) : [];
        window.sincronizarTodosModulos();
    });
}

window.salvarAgendamentosNaMemoria = function() { set(ref(db, 'yms_agendamentos_oficiais'), window.ymsStore.agendamentos); };

window.atualizarHorariosDisponiveis = function() {
    const elDoca = document.getElementById('inpDoca');
    if (!elDoca || !elDoca.value) return;
    let rawData = document.getElementById('inpData')?.value || window.obterDataHojeISO();

    const todos = [...(window.ymsStore.rascunhoAgendamentos || []), ...(window.ymsStore.agendamentos || [])];
    const dataFormatada = window.normalizarDataUniversal(rawData);
    const docaNorm = window.normalizarTexto(elDoca.value);
    const dataNorm = window.normalizarTexto(dataFormatada);

    const ocupados = [];
    todos.forEach(item => {
        if (window.normalizarTexto(window.normalizarDataUniversal(item.data)) === dataNorm && window.normalizarTexto(item.doca) === docaNorm && item.horaIni !== 'IMEDIATO') {
            let minIni = window.horaParaMinutos(item.horaIni);
            let minFim = window.horaParaMinutos(item.horaFim);
            if (minFim <= minIni) minFim = minIni + 60;
            ocupados.push({ ini: minIni, fim: minFim, ordem: item.ordem, fornecedor: item.fornecedor });
        }
    });

    const selIni = document.getElementById('inpHora');
    if (selIni) selIni.innerHTML = "";
    
    const hojeIso = window.obterDataHojeISO();
    const agora = new Date();
    const minAtuais = agora.getHours() * 60 + agora.getMinutes();

    window.slotsDia24h.forEach(slot => {
        const minSlot = window.horaParaMinutos(slot);
        let colide = ocupados.some(oc => minSlot >= oc.ini && minSlot < oc.fim);
        
        // Oculta/bloqueia horários passados se a data selecionada for hoje
        if (rawData === hojeIso && minSlot < minAtuais) {
            colide = true;
        }

        if (!colide && selIni) {
            const opt = document.createElement('option');
            opt.value = slot; opt.textContent = `${slot}h (Livre)`;
            selIni.appendChild(opt);
        }
    });

    const gridTimeline = document.getElementById('gridTimelineHorarios');
    if (gridTimeline) {
        gridTimeline.innerHTML = "";
        window.slotsDia24h.forEach(slot => {
            const minSlot = window.horaParaMinutos(slot);
            let agOcupante = ocupados.find(oc => minSlot >= oc.ini && minSlot < oc.fim);
            let passouHoje = (rawData === hojeIso && minSlot < minAtuais);

            if (agOcupante || passouHoje) {
                gridTimeline.insertAdjacentHTML('beforeend', `<div class="bg-red-500/20 border border-red-500/40 text-red-300 p-1 rounded text-center text-[10px] font-mono font-bold cursor-not-allowed opacity-60" title="${passouHoje ? 'Horário Passado' : 'Ocupado'}">${slot}</div>`);
            } else {
                gridTimeline.insertAdjacentHTML('beforeend', `<div onclick="selecionarHorarioPelaGrade('${slot}')" class="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 p-1 rounded text-center text-[10px] font-mono font-bold cursor-pointer transition">${slot}</div>`);
            }
        });
    }
    window.atualizarHorarioFimMinimo();
};

window.selecionarHorarioPelaGrade = function(slot) {
    const selIni = document.getElementById('inpHora');
    if (selIni && selIni.querySelector(`option[value="${slot}"]`)) {
        selIni.value = slot; window.atualizarHorarioFimMinimo();
    }
};

window.atualizarHorarioFimMinimo = function() {
    const selIni = document.getElementById('inpHora'), selFim = document.getElementById('inpHoraFim');
    if (!selIni || !selFim || !selIni.value) return; selFim.innerHTML = "";
    const minIni = window.horaParaMinutos(selIni.value);
    window.slotsDia24h.forEach(slot => {
        if (window.horaParaMinutos(slot) > minIni) {
            const opt = document.createElement('option'); opt.value = slot; opt.textContent = `${slot}h`; selFim.appendChild(opt);
        }
    });
};

window.criarJanelaManual = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const rawData = document.getElementById('inpData').value;
    const horaIni = document.getElementById('inpHora').value;

    if (window.dataEhPassada(rawData)) { 
        alert("OPERAÇÃO BLOQUEADA: Não é possível agendar em datas passadas."); 
        return; 
    }

    const hojeIso = window.obterDataHojeISO();
    if (rawData === hojeIso && horaIni !== 'IMEDIATO') {
        const agora = new Date();
        const minAtuais = agora.getHours() * 60 + agora.getMinutes();
        if (window.horaParaMinutos(horaIni) < minAtuais) {
            alert(`OPERAÇÃO BLOQUEADA: O horário ${horaIni}h já passou hoje!`);
            return;
        }
    }

    const dataForm = window.normalizarDataUniversal(rawData);
    const fornSel = window.limparNomeFornecedor(document.getElementById('inpFornecedor').value);
    if (!fornSel) { alert("Selecione um fornecedor."); return; }

    const tipoOp = window.tipoCargaAtivo;
    let novaOrdem = `ORD-${window.ymsStore.agendamentos.length + window.ymsStore.rascunhoAgendamentos.length + 1000}`;
    let horaFim = document.getElementById('inpHoraFim').value || "09:00";

    const item = {
        ordem: novaOrdem, data: dataForm, fornecedor: fornSel, doca: document.getElementById('inpDoca').value,
        horaIni, horaFim, tipoOperacao: tipoOp.toUpperCase(), prioridadeFila: 99, status: "AGENDADO", isRascunho: true,
        nf: null, transp: fornSel, cavalo: null, carreta: null, motorista: null, cpf: null, celular: null,
        ticket: null, docasSequencia: [], indexDocaAtual: 0
    };

    window.ymsStore.rascunhoAgendamentos.push(item);
    window.renderizarGradePCP();
    window.exibirToast("Adicionado ao Rascunho!", `Janela ${novaOrdem} criada.`, "📝");
};

window.confirmarESubirJanelas = function() {
    if (window.ymsStore.rascunhoAgendamentos.length === 0) return;
    
    const pendentesValidos = [];
    let qtdBloqueados = 0;
    const hojeIso = window.obterDataHojeISO();
    const agora = new Date();
    const minAtuais = agora.getHours() * 60 + agora.getMinutes();

    window.ymsStore.rascunhoAgendamentos.forEach(item => {
        const itemIso = window.normalizarDataParaISO(item.data);
        const ehDataPassada = window.dataEhPassada(item.data);
        
        let ehHoraPassada = false;
        if (itemIso === hojeIso && item.horaIni !== 'IMEDIATO') {
            if (window.horaParaMinutos(item.horaIni) < minAtuais) ehHoraPassada = true;
        }

        if (ehDataPassada || ehHoraPassada) {
            qtdBloqueados++;
        } else {
            delete item.isRascunho;
            item.data = window.normalizarDataUniversal(item.data);
            pendentesValidos.push(item);
        }
    });

    if (qtdBloqueados > 0) {
        alert(`🚫 SUBIDA INTERROMPIDA!\n\nForam encontradas ${qtdBloqueados} janelas com DATAS ou HORÁRIOS PASSADOS.`);
        window.ymsStore.rascunhoAgendamentos = pendentesValidos;
        window.renderizarGradePCP();
        return;
    }

    window.ymsStore.agendamentos.push(...pendentesValidos);
    window.ymsStore.rascunhoAgendamentos = [];
    window.salvarAgendamentosNaMemoria();
    window.exibirToast("Janelas Publicadas!", "Janelas salvas com sucesso.", "🚀");
};

window.sincronizarTodosModulos = function() {
    window.renderizarGradePCP();
};

window.renderizarGradePCP = function() {
    const container = document.getElementById('containerJanelas');
    if (!container) return; container.innerHTML = "";
    const todas = [...window.ymsStore.rascunhoAgendamentos, ...window.ymsStore.agendamentos];
    document.getElementById('contadorJanelas').textContent = todas.length;

    if (todas.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-10">Nenhuma janela carregada no sistema.</p>`;
        document.getElementById('painelAcaoSubir').classList.add('hidden');
        window.atualizarHorariosDisponiveis();
        return;
    }

    if (window.ymsStore.rascunhoAgendamentos.length > 0) document.getElementById('painelAcaoSubir').classList.remove('hidden');
    else document.getElementById('painelAcaoSubir').classList.add('hidden');

    todas.forEach(item => {
        container.insertAdjacentHTML('beforeend', `
            <div class="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex justify-between items-center shadow">
                <div>
                    <span class="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full">🏢 ${item.fornecedor}</span>
                    <p class="text-sm font-black text-white mt-1">📍 ${item.doca}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-yellow-400 block mb-1">📅 ${window.normalizarDataUniversal(item.data)}</span>
                    <span class="bg-emerald-500/10 text-emerald-400 font-mono text-xs px-2.5 py-1 rounded-lg">🕒 ${item.horaIni} às ${item.horaFim}</span>
                </div>
            </div>
        `);
    });
    window.atualizarHorariosDisponiveis();
};

window.exibirToast = function(titulo, sub, icone = "✨") {
    const toast = document.getElementById('toast'); if (!toast) return;
    document.getElementById('toastIcon').textContent = icone;
    document.getElementById('toastTitulo').textContent = titulo;
    document.getElementById('toastSub').textContent = sub;
    toast.className = "fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-100 z-50 min-w-[320px]";
    setTimeout(() => { toast.classList.remove('opacity-100'); toast.classList.add('opacity-0'); }, 3500);
};

// 🚀 INICIALIZAÇÃO IMEDIATA
function iniciarAplicacao() {
    setInterval(() => {
        const r = document.getElementById('relogioGlobal');
        if (r) r.innerHTML = `<span>🕒</span> <span>${new Date().toLocaleTimeString('pt-BR')}</span>`;
    }, 1000);

    const hojeIso = window.obterDataHojeISO();
    if (document.getElementById('inpData')) document.getElementById('inpData').value = hojeIso;

    const selDoca = document.getElementById('inpDoca');
    if (selDoca) {
        selDoca.innerHTML = "";
        window.listaTodasDocas.forEach(d => {
            const opt = document.createElement('option'); opt.value = d; opt.textContent = d; selDoca.appendChild(opt);
        });
    }

    window.atualizarHorariosDisponiveis();
    inicializarEscutadoresFirebase();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAplicacao);
} else {
    iniciarAplicacao();
}
