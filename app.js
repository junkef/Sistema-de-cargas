const poseGlobal = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});
poseGlobal.setOptions({
    modelComplexity: 1,
    smoothLandmarks: false,
    minDetectionConfidence: 0.15,
    minTrackingConfidence: 0.15
});

// --- LÓGICA DO JIMO (CHATBOX AMACIADO) ---
function toggleChat() {
    const chat = document.getElementById('chatWindow');
    chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
}

function obterContextoDaTela() {
    const tTotalSeg = parseFloat(document.getElementById('kpiCicloTotalVal').textContent) || 0;
    const saturacao = document.getElementById('kpiSaturacaoVal').textContent || "0%";
    const gargaloPosto = document.getElementById('kpiSaturacaoBadge').textContent || "N/A";
    const oee = document.getElementById('kpiOeeVal').textContent || "0%";
    const qtdTrechos = estudoAtual.length;

    return { tTotalSeg, saturacao, gargaloPosto, oee, qtdTrechos };
}

async function enviarMensagemChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim().toLowerCase();
    if (!msg) return;

    const chatBody = document.getElementById('chatBody');
    
    const divUser = document.createElement('div');
    divUser.className = 'msg msg-user';
    divUser.textContent = input.value; 
    chatBody.appendChild(divUser);
    input.value = '';
    
    const divAi = document.createElement('div');
    divAi.className = 'msg msg-ai';
    divAi.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> Verificando os dados...';
    chatBody.appendChild(divAi);
    chatBody.scrollTop = chatBody.scrollHeight;

    const ctx = obterContextoDaTela();
    await new Promise(r => setTimeout(r, 1200)); 
    
    let respostaIA = "";
    const satValue = parseFloat(ctx.saturacao);
    
    if (msg.includes("baixar") || msg.includes("relatório") || msg.includes("exportar") || msg.includes("excel") || msg.includes("csv")) {
        respostaIA = `Para baixar os relatórios é super fácil! Vá até a aba superior chamada <b>"📥 Exportar Dados"</b>. Lá você pode fazer o download da tabela completa para abrir no Excel (.CSV) ou gerar um backup (.JSON) para não perder o seu estudo! 🚀`;
    } else if (msg.includes("gargalo") || msg.includes("lento") || msg.includes("atrasado")) {
        if (satValue > 100) {
            respostaIA = `Dei uma olhada aqui e o ${ctx.gargaloPosto} está passando do nosso limite! Ele está com ${satValue}% de saturação (Takt = ${valorTaktTimeAtual}s). Minha sugestão: vá no Yamazumi, identifique as barras Laranjas (NVA - Não Agrega Valor) desse posto e tente transferir essas tarefas para um operador mais ocioso.`;
        } else {
            respostaIA = `Pode ficar tranquilo! Sua linha está rodando liso. O maior ciclo no momento não passa de ${valorTaktTimeAtual}s e a saturação está saudável na casa dos ${satValue}%.`;
        }
    } else if (msg.includes("oee") || msg.includes("eficiência")) {
        respostaIA = `Nosso OEE estimado atual é de <b>${ctx.oee}</b>. Vale lembrar que esse cálculo considera a disponibilidade de turno (${jornadaMinutosAtual} min) e a quantidade de tempo que realmente "Agrega Valor" (VAA) no posto gargalo. Quer que eu foque em como reduzir os tempos que não agregam valor (NVA)?`;
    } else if (msg.includes("takt") || msg.includes("meta") || msg.includes("peça")) {
        const metaPecas = document.getElementById('inputMetaPecas').value;
        respostaIA = `A matemática é a seguinte: se temos ${jornadaMinutosAtual} minutos de jornada limpa, e cada peça tem que sair a cada ${valorTaktTimeAtual} segundos (nosso Takt Time), a expectativa no fim do turno é produzir exatamente <b>${metaPecas} peças</b>.`;
    } else if (msg.includes("limpar") || msg.includes("memória") || msg.includes("aprendizado")) {
        respostaIA = `O botão <b>"Limpar Aprendizado da IA"</b> serve para apagar apenas o meu "cérebro" de correções (o banco de dados do seu navegador), mas ele <b>não apaga nada</b> da tela ou do estudo que você está fazendo agora! Pode clicar sem medo se quiser resetar minha inteligência.`;
    } else {
        respostaIA = `Excelente ponto! Analisando os <b>${ctx.qtdTrechos} trechos</b> que mapeamos até agora usando a base <b>${metodologiaAtiva}</b>, vejo que estamos no caminho certo. Se precisar focar em reduzir ciclo, investigar os códigos terminados em 2 ou 3 (alcance longo) sempre ajuda. O que você gostaria de analisar agora, o Yamazumi ou o Takt Time?`;
    }

    divAi.innerHTML = respostaIA;
    chatBody.scrollTop = chatBody.scrollHeight;
}

// --- VARIÁVEIS GLOBAIS ---
let unidadeExibicao = 'seg'; 
let valorTaktTimeAtual = 60; 
let jornadaMinutosAtual = 465;

let numeroTotalPostos = 4; 
let postoAtivo = 1;
let processandoIA = false;
let videosPostos = {}; 
let estudoAtual = [];
let metodologiaAtiva = "TODOS";

// --- BANCOS DE DADOS MTM ---
const bancoUAS = {
    "AA1": {"codigo": "AA1", "descricao": "UAS - Apanhar/Colocar < 1 daN Fácil APROXIMADO <=20", "tmu": 20.0},
    "AB1": {"codigo": "AB1", "descricao": "UAS - Apanhar/Colocar < 1 daN Fácil SOLTO <=20", "tmu": 30.0},
    "AC1": {"codigo": "AC1", "descricao": "UAS - Apanhar/Colocar < 1 daN Fácil FIRME <=20", "tmu": 40.0},
    "AG2": {"codigo": "AG2", "descricao": "UAS - Apanhar/Colocar PUNHADO APROX. >20 ATÉ <=50", "tmu": 65.0},
    "HB1": {"codigo": "HB1", "descricao": "UAS - Manuseio - COLOCAR EM POSIÇÃO", "tmu": 20.0},
    "HC1": {"codigo": "HC1", "descricao": "UAS - Manuseio - APERTAR/SOLTAR", "tmu": 30.0},
    "ABH": {"codigo": "ABH", "descricao": "UAS - Acionar Comando/Alavanca", "tmu": 20.0},
    "KA1": {"codigo": "KA1", "descricao": "UAS - Caminhar (Passo livre/Sem carga)", "tmu": 25.0},
    "TA1": {"codigo": "TA1", "descricao": "UAS - Transporte Carrinho Manual (p/ metro)", "tmu": 25.0},
    "PA1": {"codigo": "PA1", "descricao": "UAS - Manuseio Pesado Levantar carga", "tmu": 50.0}
};

const bancoMTM1 = {
    "R1A": {"codigo": "R1A", "descricao": "MTM-1 - Alcançar p/ objeto fixo (1 polegada)", "tmu": 2.5},
    "R2A": {"codigo": "R2A", "descricao": "MTM-1 - Alcançar p/ objeto fixo (2 polegadas)", "tmu": 4.0},
    "M1A": {"codigo": "M1A", "descricao": "MTM-1 - Mover objeto p/ outra mão (1 polegada)", "tmu": 2.0},
    "M2A": {"codigo": "M2A", "descricao": "MTM-1 - Mover objeto p/ outra mão (2 polegadas)", "tmu": 3.6},
    "G1A": {"codigo": "G1A", "descricao": "MTM-1 - Pegar objeto fácil isolado", "tmu": 2.0},
    "G1B": {"codigo": "G1B", "descricao": "MTM-1 - Pegar objeto muito pequeno isolado", "tmu": 3.5},
    "RL1": {"codigo": "RL1", "descricao": "MTM-1 - Soltar objeto (abrir os dedos)", "tmu": 2.0}
};

const bancoMTM2 = {
    "GA5": {"codigo": "GA5", "descricao": "MTM-2 - Pegar Fácil (Get) até 5cm", "tmu": 3.0},
    "GA15": {"codigo": "GA15", "descricao": "MTM-2 - Pegar Fácil (Get) até 15cm", "tmu": 6.0},
    "GA30": {"codigo": "GA30", "descricao": "MTM-2 - Pegar Fácil (Get) até 30cm", "tmu": 9.0},
    "GB15": {"codigo": "GB15", "descricao": "MTM-2 - Pegar Difícil (Get) até 15cm", "tmu": 10.0},
    "PA5": {"codigo": "PA5", "descricao": "MTM-2 - Posicionar Fácil (Put) até 5cm", "tmu": 3.0},
    "PA15": {"codigo": "PA15", "descricao": "MTM-2 - Posicionar Fácil (Put) até 15cm", "tmu": 6.0},
    "PB15": {"codigo": "PB15", "descricao": "MTM-2 - Posicionar Difícil (Put) até 15cm", "tmu": 15.0}
};

let bancoDadosLocal = {}; 

// MÓDULO MACHINE LEARNING
let memoriaIA = JSON.parse(localStorage.getItem('mtm_ml_memory')) || [];

function treinarIA(distanciaReferencia, codigoCorreto) {
    if(distanciaReferencia === null || isNaN(distanciaReferencia)) return;
    memoriaIA.push({ dist: distanciaReferencia, codigo: codigoCorreto });
    if (memoriaIA.length > 500) memoriaIA.shift(); 
    localStorage.setItem('mtm_ml_memory', JSON.stringify(memoriaIA));
}

function limparMemoriaIA() {
    if(confirm("Tem certeza que deseja apagar todo o aprendizado da IA? Ela voltará para o padrão de fábrica.")) {
        localStorage.removeItem('mtm_ml_memory');
        memoriaIA = [];
        alert("Memória do JIMO limpa com sucesso!");
    }
}

let meuGraficoYamazumi = null;

function iniciarSistemaBase() {
    const inputQtd = document.getElementById('inputQtdPostos').value;
    const qtd = parseInt(inputQtd);
    if (isNaN(qtd) || qtd < 1) return alert("Por favor, insira um número válido de postos (mínimo 1).");
    
    numeroTotalPostos = qtd;
    videosPostos = {};

    metodologiaAtiva = document.getElementById('inputMetodologia').value;
    bancoDadosLocal = {};
    
    if (metodologiaAtiva === "UAS") {
        Object.assign(bancoDadosLocal, bancoUAS);
    } else if (metodologiaAtiva === "MTM1") {
        Object.assign(bancoDadosLocal, bancoMTM1);
    } else if (metodologiaAtiva === "MTM2") {
        Object.assign(bancoDadosLocal, bancoMTM2);
    } else {
        Object.assign(bancoDadosLocal, bancoUAS, bancoMTM1, bancoMTM2);
    }

    const containerSelector = document.getElementById('postoSelectorContainer');
    containerSelector.innerHTML = ''; 

    for (let i = 1; i <= numeroTotalPostos; i++) {
        videosPostos[i] = null; 
        const btn = document.createElement('button');
        btn.id = 'btnPosto' + i;
        btn.className = 'btn-posto';
        btn.innerHTML = `🏭 Posto ${i}`;
        btn.onclick = () => selecionarPosto(i);
        containerSelector.appendChild(btn);
    }

    document.getElementById('modalConfigInicial').style.display = 'none';
    
    carregarBancoMTM();
    inicializarGrafico();
    selecionarPosto(1);
}

function selecionarPosto(numero) {
    if (processandoIA) return alert("Aguarde a conclusão da análise em andamento."); 
    
    postoAtivo = numero;
    document.querySelectorAll('.btn-posto').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btnPosto' + numero).classList.add('active');
    
    document.getElementById('tituloUpload').textContent = `Carregar Vídeo - Posto ${numero}`;
    document.getElementById('tituloTabelaIA').textContent = `Mapeamento Temporário - Posto ${numero}`;
    
    document.getElementById('corpoTabelaIA').innerHTML = '';
    document.getElementById('aiResults').style.display = 'none';

    const player = document.getElementById('meuPlayer');
    if (videosPostos[numero]) {
        player.src = videosPostos[numero];
        player.style.display = 'block';
        document.getElementById('playerPlaceholder').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('botoesIaContainer').style.display = 'flex';
    } else {
        player.src = '';
        player.style.display = 'none';
        document.getElementById('playerPlaceholder').style.display = 'inline';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('botoesIaContainer').style.display = 'none';
    }
}

function carregarVideo(event) {
    const arquivo = event.target.files[0];
    if (arquivo) {
        const videoUrl = URL.createObjectURL(arquivo);
        videosPostos[postoAtivo] = videoUrl;
        
        const player = document.getElementById('meuPlayer');
        player.src = videoUrl;
        player.style.display = "block"; 
        document.getElementById('playerPlaceholder').style.display = "none";
        document.getElementById('uploadArea').style.display = "none";
        document.getElementById('botoesIaContainer').style.display = "flex";
    }
}

function alterarJornada(novaJornada) {
    const jornadaVal = parseFloat(novaJornada);
    if (!isNaN(jornadaVal) && jornadaVal > 0) {
        jornadaMinutosAtual = jornadaVal;
        const jornadaSegundos = jornadaMinutosAtual * 60;
        const novaMetaPecas = Math.floor(jornadaSegundos / valorTaktTimeAtual);
        document.getElementById('inputMetaPecas').value = novaMetaPecas;
        atualizarInterfaceGBO();
    }
}

function alterarTaktTime(novoTakt) {
    const taktVal = parseFloat(novoTakt);
    if (!isNaN(taktVal) && taktVal > 0) {
        valorTaktTimeAtual = taktVal;
        const jornadaSegundos = jornadaMinutosAtual * 60;
        const novaMetaPecas = Math.floor(jornadaSegundos / taktVal);
        document.getElementById('inputMetaPecas').value = novaMetaPecas;
        atualizarInterfaceGBO();
    }
}

function alterarMetaPecas(novaMeta) {
    const metaVal = parseFloat(novaMeta);
    if (!isNaN(metaVal) && metaVal > 0) {
        const jornadaSegundos = jornadaMinutosAtual * 60;
        const novoTakt = Math.round(jornadaSegundos / metaVal);
        document.getElementById('inputTaktTime').value = novoTakt;
        valorTaktTimeAtual = novoTakt;
        atualizarInterfaceGBO();
    }
}

const pluginLinhaTaktTime = {
    id: 'taktTimeLinePlugin',
    beforeDraw: (chart) => {
        if (typeof valorTaktTimeAtual === 'undefined' || valorTaktTimeAtual === null) return;
        const ctx = chart.ctx;
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        const valLinha = (unidadeExibicao === 'tmu') ? (valorTaktTimeAtual / 0.036) : valorTaktTimeAtual;
        const yPixel = yScale.getPixelForValue(valLinha);
        if (yPixel >= yScale.top && yPixel <= yScale.bottom) {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#e63946';
            ctx.moveTo(xScale.left, yPixel);
            ctx.lineTo(xScale.right, yPixel);
            ctx.stroke();
            ctx.fillStyle = '#e63946';
            ctx.font = 'bold 12px Segoe UI, sans-serif';
            ctx.fillText(`--- Takt Time Meta (${valorTaktTimeAtual}s / ${Math.round(valorTaktTimeAtual/0.036)} TMU)`, xScale.right - 260, yPixel - 6);
            ctx.restore();
        }
    }
};

function alterarUnidadeVisualizacao(unidade) {
    unidadeExibicao = unidade;
    document.getElementById('btnUnitSeg').classList.toggle('active', unidade === 'seg');
    document.getElementById('btnUnitTmu').classList.toggle('active', unidade === 'tmu');
    atualizarInterfaceGBO();
}

function renderizarSelectManual() {
    const select = document.getElementById('codigoMtm');
    select.innerHTML = '';
    Object.keys(bancoDadosLocal).forEach(key => {
        const item = bancoDadosLocal[key];
        const tmu = item.tmu || 20;
        const opcao = document.createElement('option');
        opcao.value = key;
        opcao.textContent = `${key} - ${item.descricao} (${tmu} TMU / ${(tmu * 0.036).toFixed(2)}s)`;
        select.appendChild(opcao);
    });
}

function carregarBancoMTM() { renderizarSelectManual(); }

function obterDadosCodigoMTM(codigoProcurado) {
    if (bancoDadosLocal[codigoProcurado]) return bancoDadosLocal[codigoProcurado];
    return { codigo: codigoProcurado, descricao: 'Elemento MTM (Personalizado)', tmu: 20 };
}

function inicializarGrafico() {
    const ctx = document.getElementById('yamazumiChart').getContext('2d');
    const labelsDinamicas = Array.from({length: numeroTotalPostos}, (_, i) => `Posto ${i+1}`);

    meuGraficoYamazumi = new Chart(ctx, {
        type: 'bar',
        data: { labels: labelsDinamicas, datasets: [] },
        plugins: [pluginLinhaTaktTime],
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { stacked: true },
                y: { stacked: true, min: 0, max: 220, title: { display: true, text: 'Duração em Segundos (s)' } }
            }
        }
    });
}

async function rodarIALogicaCore(videoUrl, postoProcessado, isBatch = false) {
    return new Promise(async (resolveGlobal) => {
        try {
            if (isBatch) {
                document.getElementById('modalProgressFill').style.width = '0%';
                document.getElementById('textoModalPorcentagem').textContent = '0%';
            } else {
                document.getElementById('aiProgressFill').style.width = '0%';
                document.getElementById('aiProgressText').textContent = '0% Concluído';
            }

            const offscreenVideo = document.createElement('video');
            offscreenVideo.src = videoUrl;
            offscreenVideo.muted = true;
            offscreenVideo.playsInline = true;

            await new Promise((resolveLoad) => {
                let resolvido = false;
                let timeoutLoad = setTimeout(() => {
                    if (!resolvido) { resolvido = true; resolveLoad(); }
                }, 5000); 
                offscreenVideo.onloadeddata = () => {
                    if (!resolvido) { resolvido = true; clearTimeout(timeoutLoad); resolveLoad(); }
                };
                offscreenVideo.onerror = () => {
                    if (!resolvido) { resolvido = true; clearTimeout(timeoutLoad); resolveLoad(); }
                };
            });

            if (isNaN(offscreenVideo.duration) || offscreenVideo.duration === 0) {
                console.warn(`Vídeo não renderizado no Posto ${postoProcessado}.`);
                return resolveGlobal([]); 
            }

            const canvasCongelado = document.createElement('canvas');
            const ctxCongelado = canvasCongelado.getContext('2d');
            canvasCongelado.width = offscreenVideo.videoWidth || 640;
            canvasCongelado.height = offscreenVideo.videoHeight || 480;

            try { await poseGlobal.reset(); } catch(e){}

            let movimentosDetectados = [];
            let posAnterior = null;
            const passoTempo = 0.5;
            const duracaoTotal = offscreenVideo.duration;
            const totalPassos = Math.floor(duracaoTotal / passoTempo);

            let poseResultsTemp = null;
            let resolvePoseFrame = null;

            poseGlobal.onResults((res) => {
                poseResultsTemp = res;
                if (resolvePoseFrame) {
                    resolvePoseFrame();
                    resolvePoseFrame = null;
                }
            });

            for (let passo = 1; passo <= totalPassos; passo++) {
                let instante = passo * passoTempo;

                await new Promise((resolveSeek) => {
                    if (Math.abs(offscreenVideo.currentTime - instante) < 0.05) return setTimeout(resolveSeek, 10);
                    let resolvido = false;
                    let timerFallback = setTimeout(() => {
                        if (!resolvido) { resolvido = true; offscreenVideo.onseeked = null; resolveSeek(); }
                    }, 1000); 
                    offscreenVideo.onseeked = () => {
                        if (resolvido) return;
                        resolvido = true;
                        clearTimeout(timerFallback);
                        offscreenVideo.onseeked = null;
                        setTimeout(resolveSeek, 10);
                    };
                    offscreenVideo.currentTime = instante;
                });

                if (offscreenVideo.readyState >= 2) {
                    try { ctxCongelado.drawImage(offscreenVideo, 0, 0, canvasCongelado.width, canvasCongelado.height); } catch(e) {}
                }

                try { await poseGlobal.reset(); } catch(e){}

                poseResultsTemp = null;
                await new Promise(r => {
                    resolvePoseFrame = r;
                    let timerMp = setTimeout(() => { if(resolvePoseFrame) { resolvePoseFrame = null; r(); } }, 1500);
                    poseGlobal.send({ image: canvasCongelado }).then(() => { clearTimeout(timerMp); }).catch(e => { clearTimeout(timerMp); if(resolvePoseFrame) { resolvePoseFrame = null; r(); } });
                });

                let pulsoDir = null;
                let pulsoEsq = null;
                
                if (poseResultsTemp && poseResultsTemp.poseLandmarks) {
                    const lms = poseResultsTemp.poseLandmarks;
                    const pD = lms[16] || lms[14] || lms[12];
                    if (pD) { pulsoDir = { x: parseFloat(pD.x.toFixed(3)), y: parseFloat(pD.y.toFixed(3)) }; }
                    const pE = lms[15] || lms[13];
                    if (pE) { pulsoEsq = { x: parseFloat(pE.x.toFixed(3)), y: parseFloat(pE.y.toFixed(3)) }; }
                }

                let dist = 0.05;
                if (pulsoDir && posAnterior) {
                    const dx = pulsoDir.x - posAnterior.x;
                    const dy = pulsoDir.y - posAnterior.y;
                    dist = parseFloat(Math.sqrt(dx*dx + dy*dy).toFixed(3));
                }

                let codigoSugerido = null;
                let acaoDetalhada = "";
                let tipoIA = "padrao";
                let bestMatchDist = Infinity;

                if (memoriaIA.length > 0) {
                    for(let memo of memoriaIA) {
                        let distAbsoluta = Math.abs(memo.dist - dist);
                        if(distAbsoluta < 0.02 && distAbsoluta < bestMatchDist && bancoDadosLocal[memo.codigo]) { 
                            bestMatchDist = distAbsoluta;
                            codigoSugerido = memo.codigo;
                            tipoIA = "learned";
                        }
                    }
                }

                if (!codigoSugerido) {
                    if (metodologiaAtiva === "MTM1") {
                        if (dist <= 0.02) { codigoSugerido = "G1A"; acaoDetalhada = "Pegar fácil"; } 
                        else if (dist > 0.02 && dist <= 0.06) { codigoSugerido = "M1A"; acaoDetalhada = "Mover objeto curto"; } 
                        else { codigoSugerido = "R2A"; acaoDetalhada = "Alcançar objeto"; }
                    } 
                    else if (metodologiaAtiva === "MTM2") {
                        if (dist <= 0.05) { codigoSugerido = "GA5"; acaoDetalhada = "Pegar 5cm"; } 
                        else if (dist > 0.05 && dist <= 0.15) { codigoSugerido = "GA15"; acaoDetalhada = "Pegar 15cm"; } 
                        else { codigoSugerido = "PA15"; acaoDetalhada = "Posicionar longo"; }
                    }
                    else {
                        if (instante < 0.8) { codigoSugerido = "ABH"; acaoDetalhada = "Acionar / Segurar firme"; } 
                        else if (instante >= 0.8 && instante < 1.6 && dist <= 0.04) { codigoSugerido = "HC1"; acaoDetalhada = "Apertar / Soltar"; } 
                        else {
                            if (dist <= 0.02) { codigoSugerido = "ABH"; acaoDetalhada = "Estático / Posicionamento Base"; } 
                            else if (dist > 0.02 && dist <= 0.05) { codigoSugerido = "HB1"; acaoDetalhada = "Posicionamento fino"; } 
                            else if (dist > 0.05 && dist <= 0.15) { codigoSugerido = "AB1"; acaoDetalhada = "Alcançar / Apanhar curto"; } 
                            else { codigoSugerido = "AG2"; acaoDetalhada = "Alcançar / Apanhar longo"; }
                        }
                    }
                } else {
                    const mtmRef = obterDadosCodigoMTM(codigoSugerido);
                    acaoDetalhada = `Identificado pela Memória: ${mtmRef.descricao}`;
                }

                let idMembro = "Mão Direita";
                if (pulsoEsq && Math.abs(pulsoEsq.y - (pulsoDir ? pulsoDir.y : 0)) < 0.1) {
                    idMembro = "Ambas as Mãos";
                }

                let textoDescritivoSugerido = `${idMembro} -> ${acaoDetalhada}`;

                movimentosDetectados.push({
                    inicio: (instante - passoTempo).toFixed(1),
                    fim: instante.toFixed(1),
                    membro: idMembro,
                    distRaw: dist, 
                    codigo: codigoSugerido,
                    textoGerado: textoDescritivoSugerido, 
                    tipoModelo: tipoIA 
                });

                if (pulsoDir) posAnterior = pulsoDir;

                let porcentagem = Math.round((passo / totalPassos) * 100);
                
                if (isBatch) {
                    document.getElementById('modalProgressFill').style.width = porcentagem + '%';
                    document.getElementById('textoModalPorcentagem').textContent = porcentagem + '%';
                } else {
                    document.getElementById('aiProgressFill').style.width = porcentagem + '%';
                    document.getElementById('aiProgressText').textContent = porcentagem + '% Concluído';
                }
            }

            resolveGlobal(movimentosDetectados);
        } catch (fatalError) {
            console.error("Erro no processamento interno do vídeo:", fatalError);
            resolveGlobal([]); 
        }
    });
}

async function iniciarAnaliseSingle() {
    if (processandoIA) return alert("Uma análise já está em andamento. Aguarde.");
    
    const videoUrl = videosPostos[postoAtivo];
    if (!videoUrl) return alert("Nenhum vídeo carregado neste posto!");

    try {
        processandoIA = true;
        document.getElementById('botoesIaContainer').style.display = "none";
        document.getElementById('aiLoading').style.display = "block";
        document.getElementById('aiLoadingText').textContent = `Processando IA no Posto ${postoAtivo}...`;

        estudoAtual = estudoAtual.filter(item => item.posto !== postoAtivo);
        atualizarInterfaceGBO();

        let movs = await rodarIALogicaCore(videoUrl, postoAtivo, false);
        exibirResultadosIA(movs);

    } catch (err) {
        console.error("Erro na analise individual:", err);
        alert("Ocorreu um erro ao processar o vídeo.");
    } finally {
        document.getElementById('aiLoading').style.display = "none";
        document.getElementById('botoesIaContainer').style.display = "flex";
        processandoIA = false;
    }
}

async function processarTodosPostosEmLote() {
    if (processandoIA) return alert("Uma análise já está em andamento. Aguarde a conclusão.");
    
    let temVideo = false;
    for (let i = 1; i <= numeroTotalPostos; i++) { if (videosPostos[i]) temVideo = true; }
    if (!temVideo) return alert("Nenhum vídeo carregado nos postos!");

    if (!confirm("Isso irá analisar e AUTO-APROVAR todos os vídeos carregados. O processo pode levar alguns minutos. Deseja continuar?")) return;

    try {
        processandoIA = true;
        estudoAtual = []; 
        atualizarInterfaceGBO();

        const modal = document.getElementById('modalProgressoLote');
        const modalTexto = document.getElementById('textoModalPosto');
        modal.style.display = 'flex';
        
        await new Promise(r => setTimeout(r, 150));

        for (let i = 1; i <= numeroTotalPostos; i++) {
            if (videosPostos[i]) {
                document.querySelectorAll('.btn-posto').forEach(b => b.classList.remove('active'));
                document.getElementById('btnPosto' + i).classList.add('active');
                
                modalTexto.textContent = `Analisando Vídeo do Posto ${i} de ${numeroTotalPostos}...`;
                
                let movs = await rodarIALogicaCore(videosPostos[i], i, true);

                if (movs && movs.length > 0) {
                    movs.forEach(mov => {
                        const mtmObj = obterDadosCodigoMTM(mov.codigo);
                        estudoAtual.push({
                            posto: i,
                            codigo: mov.codigo,
                            distBruta: mov.distRaw, 
                            descricao: mtmObj.descricao,
                            textoDescritivo: mov.textoGerado, 
                            tmu: Number(mtmObj.tmu),
                            inicio: parseFloat(mov.inicio),
                            fim: parseFloat(mov.fim)
                        });
                    });
                }
            }
        }

        processandoIA = false; 
        selecionarPosto(postoAtivo); 
        atualizarInterfaceGBO();
        
        alert("✅ Mapeamento em Lote Concluído com Sucesso!");
        document.getElementById('abaGboBtn').click();

    } catch (erro) {
        console.error("Falha fatal na Análise em Lote:", erro);
        alert(`A análise encontrou um erro: ${erro.message}`);
    } finally {
        document.getElementById('modalProgressoLote').style.display = 'none';
        document.getElementById('botoesIaContainer').style.display = "flex";
        processandoIA = false; 
    }
}

function exibirResultadosIA(movimentos) {
    document.getElementById('aiResults').style.display = "block";
    const tbody = document.getElementById('corpoTabelaIA');
    tbody.innerHTML = '';

    if (!movimentos || movimentos.length === 0) return alert("O vídeo não pôde ser analisado ou a duração é nula.");

    movimentos.forEach((mov, idx) => {
        const tr = document.createElement('tr');
        let opcoesHtml = '';
        Object.keys(bancoDadosLocal).forEach(key => {
            const item = bancoDadosLocal[key];
            const cod = item.codigo || key;
            const selected = (cod === mov.codigo) ? 'selected' : '';
            opcoesHtml += `<option value="${cod}" ${selected}>${cod} - ${item.descricao} (${item.tmu} TMU)</option>`;
        });

        let badgeClasseIA = mov.tipoModelo === "learned" ? "badge-ia-learned" : "badge-ia-padrao";
        let txtBadgeIA = mov.tipoModelo === "learned" ? "IA Aprendida 🧠" : "IA Padrão 🤖";

        tr.innerHTML = `
            <td><b>${mov.inicio}s - ${mov.fim}s</b></td>
            <td><span style="font-size:11px; font-weight:bold; color:#264653;">${mov.membro}</span></td>
            <td>
                <input type="text" id="desc_ia_${idx}" class="input-obs" value="${mov.textoGerado}">
            </td>
            <td>
                <select id="select_ia_${idx}" class="select-ia-inline" onchange="treinarIA(${mov.distRaw}, this.value)">
                    ${opcoesHtml}
                </select>
                <span class="badge-ia ${badgeClasseIA}">${txtBadgeIA}</span>
            </td>
            <td>
                <button onclick="adicionarTrechoSelect('select_ia_${idx}', 'desc_ia_${idx}', ${mov.inicio}, ${mov.fim}, ${mov.distRaw})" 
                        style="border:none; background:#2a9d8f; color:white; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">
                    Aprovar ✓
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adicionarTrechoSelect(idSelect, idDesc, inicio, fim, distRaw) {
    const codigoSelecionado = document.getElementById(idSelect).value;
    const textoDesc = document.getElementById(idDesc).value;
    adicionarTrecho(codigoSelecionado, inicio, fim, textoDesc, distRaw);
}

function aprovarTodosTrechos() {
    const botoesAprovar = document.querySelectorAll('#corpoTabelaIA button');
    if (botoesAprovar.length === 0) return alert('Nenhum trecho para aprovar.');
    
    botoesAprovar.forEach(btn => btn.click());
    document.getElementById('corpoTabelaIA').innerHTML = '';
    document.getElementById('aiResults').style.display = 'none';
    alert(`Todos os elementos do Posto ${postoAtivo} consolidados!`);
}

function removerTrecho(index) {
    if (confirm("Deseja excluir este elemento da linha de produção?")) {
        estudoAtual.splice(index, 1);
        atualizarInterfaceGBO();
    }
}

function adicionarTrecho(codigo, inicio, fim, textoLivre = "", distRaw = null) {
    const mtmObj = obterDadosCodigoMTM(codigo);
    estudoAtual.push({
        posto: postoAtivo,
        codigo: codigo,
        distBruta: distRaw, 
        descricao: mtmObj.descricao,
        textoDescritivo: textoLivre, 
        tmu: Number(mtmObj.tmu),
        inicio: parseFloat(inicio),
        fim: parseFloat(fim)
    });
    atualizarInterfaceGBO();
}

function adicionarTrechoManual() {
    const selectElem = document.getElementById('codigoMtm');
    const codigo = selectElem.value;
    if (!codigo) return alert("Selecione um código MTM.");
    const tInicioInput = document.getElementById('tInicio').value;
    const tFimInput = document.getElementById('tFim').value;
    if (tInicioInput === "" || tFimInput === "") return alert("Informe o Início e Fim!");
    const inicio = parseFloat(tInicioInput);
    const fim = parseFloat(tFimInput);
    if (isNaN(inicio) || isNaN(fim) || fim <= inicio) return alert("Valores de tempo inválidos.");
    
    adicionarTrecho(codigo, inicio, fim, "Adicionado Manualmente");
    document.getElementById('tInicio').value = '';
    document.getElementById('tFim').value = '';
}

function alterarCodigoTrecho(index, novoCodigo) {
    const mtmObj = obterDadosCodigoMTM(novoCodigo);
    
    if (estudoAtual[index].distBruta !== null && estudoAtual[index].distBruta !== undefined) {
        treinarIA(estudoAtual[index].distBruta, novoCodigo);
    }

    estudoAtual[index].codigo = novoCodigo;
    estudoAtual[index].descricao = mtmObj.descricao;
    estudoAtual[index].tmu = Number(mtmObj.tmu);
    atualizarInterfaceGBO();
}

function alterarTextoObservacao(index, novoTexto) {
    estudoAtual[index].textoDescritivo = novoTexto;
}

function atualizarInterfaceGBO() {
    const tabela = document.getElementById('tabelaEstudos');
    tabela.innerHTML = '';

    let temposVAA_TMU = new Array(numeroTotalPostos).fill(0);
    let temposNVA_TMU = new Array(numeroTotalPostos).fill(0);
    let temposVAA_Seg = new Array(numeroTotalPostos).fill(0);
    let temposNVA_Seg = new Array(numeroTotalPostos).fill(0);
    let temposTotais_Seg = new Array(numeroTotalPostos).fill(0);

    estudoAtual.sort((a, b) => a.posto - b.posto).forEach((item, index) => {
        const duracaoSeg = (item.fim - item.inicio).toFixed(1);
        const pIdx = item.posto - 1; 

        const isNVA = (item.codigo.startsWith("A") || item.codigo.startsWith("K") || item.codigo.startsWith("Z") || item.codigo.startsWith("W") || item.codigo.startsWith("E") || item.codigo.startsWith("T") || item.codigo.startsWith("P"));
        
        if (isNVA) {
            temposNVA_TMU[pIdx] += item.tmu;
            temposNVA_Seg[pIdx] += (item.tmu * 0.036);
        } else {
            temposVAA_TMU[pIdx] += item.tmu;
            temposVAA_Seg[pIdx] += (item.tmu * 0.036);
        }
        temposTotais_Seg[pIdx] += (item.tmu * 0.036);

        let opcoesHtml = '';
        Object.keys(bancoDadosLocal).forEach(key => {
            const itemBD = bancoDadosLocal[key];
            const selected = (key === item.codigo) ? 'selected' : '';
            opcoesHtml += `<option value="${key}" ${selected}>${key} - ${itemBD.descricao} (${itemBD.tmu} TMU)</option>`;
        });

        const valorExibicao = (unidadeExibicao === 'tmu') ? `${item.tmu} TMU` : `${(item.tmu * 0.036).toFixed(2)}s`;
        let badgeVAA = isNVA ? `<span class="badge-nva">NVA</span>` : `<span class="badge-vaa">VAA</span>`;
        const textoObs = item.textoDescritivo || '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge-posto">P${item.posto}</span></td>
            <td><b>${item.inicio}s - ${item.fim}s</b></td>
            <td>${badgeVAA}</td>
            <td>
                <select class="select-gbo" onchange="alterarCodigoTrecho(${index}, this.value)">
                    ${opcoesHtml}
                </select>
            </td>
            <td>
                <input type="text" class="input-obs" placeholder="Ex: Alcançar parafuso 10mm" value="${textoObs}" onchange="alterarTextoObservacao(${index}, this.value)">
            </td>
            <td><b>${valorExibicao}</b></td>
            <td><button class="btn-play-clip" onclick="tocarTrechoPosto(${item.posto}, ${item.inicio})">▶ Reproduzir</button></td>
            <td><button class="btn-delete" onclick="removerTrecho(${index})">🗑️</button></td>
        `;
        tabela.appendChild(tr);
    });

    let maiorCicloGargaloSeg = Math.max(...temposTotais_Seg);
    if (maiorCicloGargaloSeg === -Infinity) maiorCicloGargaloSeg = 0; 
    let indiceGargalo = temposTotais_Seg.indexOf(maiorCicloGargaloSeg);
    let numGargalo = indiceGargalo + 1;

    let gargaloVaaSeg = temposVAA_Seg[indiceGargalo] || 0;
    let gargaloNvaSeg = temposNVA_Seg[indiceGargalo] || 0;
    let gargaloVaaTmu = temposVAA_TMU[indiceGargalo] || 0;
    let gargaloNvaTmu = temposNVA_TMU[indiceGargalo] || 0;
    let totalGargaloTmu = gargaloVaaTmu + gargaloNvaTmu;

    const taktSeg = parseFloat(document.getElementById('inputTaktTime').value) || 60;
    valorTaktTimeAtual = taktSeg; 
    const taktTmu = taktSeg / 0.036;

    document.getElementById('taktExibicaoUnit').textContent = `${taktSeg} seg (${Math.round(taktTmu)} TMU)`;

    const eficienciaVaaGargalo = maiorCicloGargaloSeg > 0 ? ((gargaloVaaSeg / maiorCicloGargaloSeg) * 100) : 0;

    if (unidadeExibicao === 'tmu') {
        document.getElementById('kpiCicloTotalVal').textContent = `${Math.round(totalGargaloTmu)} TMUs`;
        document.getElementById('kpiVaaVal').textContent = `${Math.round(gargaloVaaTmu)} TMU`;
        document.getElementById('kpiNvaVal').textContent = `${Math.round(gargaloNvaTmu)} TMU`;
    } else {
        document.getElementById('kpiCicloTotalVal').textContent = `${maiorCicloGargaloSeg.toFixed(1)} seg`;
        document.getElementById('kpiVaaVal').textContent = `${gargaloVaaSeg.toFixed(1)}s`;
        document.getElementById('kpiNvaVal').textContent = `${gargaloNvaSeg.toFixed(1)}s`;
    }

    document.getElementById('kpiEficienciaVaa').textContent = eficienciaVaaGargalo.toFixed(1) + "%";

    const saturacao = taktSeg > 0 ? ((maiorCicloGargaloSeg / taktSeg) * 100) : 0;
    const saturacaoElem = document.getElementById('kpiSaturacaoVal');
    const badgeElem = document.getElementById('kpiSaturacaoBadge');

    saturacaoElem.textContent = saturacao.toFixed(1) + "%";

    if (saturacao === 0) {
        badgeElem.textContent = "Aguardando Dados";
        badgeElem.className = "kpi-badge kpi-ok";
    } else if (saturacao <= 85) {
        badgeElem.textContent = `Linha Desbalanceada (Gargalo P${numGargalo})`;
        badgeElem.className = "kpi-badge kpi-ok";
    } else if (saturacao <= 100) {
        badgeElem.textContent = `Linha Otimizada (Gargalo P${numGargalo})`;
        badgeElem.className = "kpi-badge kpi-warn";
    } else {
        badgeElem.textContent = `Linha Sobrecaregada (Gargalo P${numGargalo})`;
        badgeElem.className = "kpi-badge kpi-danger";
    }

    const disponibilidade = 0.912;
    const performanceGlobal = taktSeg > 0 ? Math.min((gargaloVaaSeg / taktSeg), 1.0) : 0;
    const oeeEstimado = (disponibilidade * performanceGlobal * 0.99) * 100;
    document.getElementById('kpiOeeVal').textContent = oeeEstimado.toFixed(1) + "%";

    const arrayVAA = (unidadeExibicao === 'tmu') ? temposVAA_TMU : temposVAA_Seg;
    const arrayNVA = (unidadeExibicao === 'tmu') ? temposNVA_TMU : temposNVA_Seg;

    if (meuGraficoYamazumi) {
        const maxEixoY = (unidadeExibicao === 'tmu') ? Math.round(220 / 0.036) : 220;
        meuGraficoYamazumi.options.scales.y.max = maxEixoY;
        meuGraficoYamazumi.options.scales.y.title.text = (unidadeExibicao === 'tmu') ? 'Duração em TMUs' : 'Duração em Segundos (s)';
        
        meuGraficoYamazumi.data.labels = Array.from({length: numeroTotalPostos}, (_, i) => `Posto ${i+1}`);
        
        meuGraficoYamazumi.data.datasets = [
            { label: `VAA (Agrega Valor)`, data: arrayVAA, backgroundColor: '#2a9d8f', borderColor: '#1f7a6f', borderWidth: 1, stack: 'yamazumiStack' },
            { label: `NVA (Não Agrega)`, data: arrayNVA, backgroundColor: '#f4a261', borderColor: '#e76f51', borderWidth: 1, stack: 'yamazumiStack' }
        ];
        meuGraficoYamazumi.update();
    }
}

function tocarTrechoPosto(postoNum, segundoInicio) {
    const playerGbo = document.getElementById('playerGbo');
    const containerGbo = document.getElementById('containerPlayerGbo');

    if (videosPostos[postoNum]) {
        document.getElementById('tituloPlayerGbo').textContent = `▶ Reprodução do Trecho - Posto ${postoNum}`;
        playerGbo.src = videosPostos[postoNum];
        containerGbo.style.display = 'block';
        playerGbo.currentTime = segundoInicio;
        playerGbo.play();
        containerGbo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        alert(`O vídeo do Posto ${postoNum} não está carregado!`);
    }
}

function fecharPlayerGbo() {
    const playerGbo = document.getElementById('playerGbo');
    const containerGbo = document.getElementById('containerPlayerGbo');
    playerGbo.pause();
    containerGbo.style.display = 'none';
}

function exportarRelatorioCSV() {
    if (estudoAtual.length === 0) return alert('Nenhum trecho para exportar!');
    
    let csv = "Posto,Inicio(s),Fim(s),Tipo,Codigo_MTM,Descricao_MTM,Observacao_Livre,TMU,Segundos\n";
    
    estudoAtual.sort((a, b) => a.posto - b.posto).forEach(r => {
        const tipo = (r.codigo.startsWith("A") || r.codigo.startsWith("K") || r.codigo.startsWith("Z") || r.codigo.startsWith("W") || r.codigo.startsWith("E") || r.codigo.startsWith("T") || r.codigo.startsWith("P")) ? "NVA" : "VAA";
        const obsLivre = r.textoDescritivo ? r.textoDescritivo.replace(/(\r\n|\n|\r|,)/gm, " ") : ""; 
        csv += `Posto ${r.posto},${r.inicio},${r.fim},${tipo},${r.codigo},"${r.descricao}","${obsLivre}",${r.tmu},${(r.tmu * 0.036).toFixed(2)}\n`;
    });
    
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = "balanceamento_linha_gbo.csv";
    link.click();
}

function exportarRelatorioJSON() {
    if (estudoAtual.length === 0) return alert('Nenhum trecho para exportar!');
    const link = document.createElement("a");
    link.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(estudoAtual, null, 2));
    link.download = "backup_multi_postos_gbo.json";
    link.click();
}

function abrirAba(evt, nomeAba) {
    if (processandoIA) return alert("Aguarde a conclusão do mapeamento em andamento.");
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    document.getElementById(nomeAba).style.display = 'block';
    if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

window.onload = function() {
    document.getElementById('modalConfigInicial').style.display = 'flex';
};
