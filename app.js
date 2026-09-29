// Daftar Kasus Tersedia
const availableCases = [
    { id: 'budi-santoso', title: 'Dugaan Penipuan Investasi Budi Santoso', file: 'cases/budi-santoso.json' }
];

let currentCaseData = null;
let userActions = {};

// STATS & HISTORY (Disimpan di LocalStorage HP)
let judgeStats = JSON.parse(localStorage.getItem('judgeStats')) || {
    score: 0,
    casesCompleted: 0,
    correctVerdicts: 0,
    history: []
};

// INITIALIZATION
window.onload = () => {
    updateHomepageUI();
};

function showHomepage() {
    document.getElementById('view-gameplay').classList.remove('active');
    document.getElementById('view-homepage').classList.add('active');
    updateHomepageUI();
}

function updateHomepageUI() {
    // 1. Update Skor & Gelar Hakim
    document.getElementById('stat-score').innerText = judgeStats.score;
    document.getElementById('stat-cases').innerText = judgeStats.casesCompleted;
    
    let accuracy = judgeStats.casesCompleted > 0 
        ? Math.round((judgeStats.correctVerdicts / judgeStats.casesCompleted) * 100) 
        : 0;
    document.getElementById('stat-accuracy').innerText = `${accuracy}%`;

    // Gelar Hakim berdasarkan skor
    let title = "Hakim Pratama";
    if (judgeStats.score >= 300) title = "Hakim Agung";
    else if (judgeStats.score >= 150) title = "Hakim Utama";
    else if (judgeStats.score >= 50) title = "Hakim Madya";
    document.getElementById('judge-title').innerText = title;

    // 2. Render Daftar Kasus
    const caseListEl = document.getElementById('case-list-container');
    caseListEl.innerHTML = '';
    availableCases.forEach(c => {
        const item = document.createElement('div');
        item.className = 'case-item';
        item.innerHTML = `
            <div>
                <strong>${c.title}</strong>
                <p class="sub-text">Pidana Khusus / Umum</p>
            </div>
            <button class="btn-start" onclick="startCase('${c.file}')">SIDANGKAN</button>
        `;
        caseListEl.appendChild(item);
    });

    // 3. Render Riwayat Kasus
    const historyEl = document.getElementById('history-container');
    if (judgeStats.history.length === 0) {
        historyEl.innerHTML = `<p class="text-muted text-center">Belum ada riwayat kasus yang diputus.</p>`;
    } else {
        historyEl.innerHTML = '';
        judgeStats.history.forEach(h => {
            const div = document.createElement('div');
            div.className = 'history-item';
            let badge = h.isCorrect ? '<span style="color:#2ecc71;">✅ Tepat</span>' : '<span style="color:#e74c3c;">❌ Cacat Hukum</span>';
            div.innerHTML = `
                <span>${h.title} (${h.verdict})</span>
                <span>${badge}</span>
            `;
            historyEl.appendChild(div);
        });
    }
}

// START GAMEPLAY
async function startCase(caseFile) {
    try {
        const response = await fetch(caseFile);
        currentCaseData = await response.json();
        
        // Reset UI Gameplay
        document.getElementById('legal-evaluation-card').style.display = 'none';
        document.getElementById('verdict-action-card').style.display = 'block';
        userActions = {};

        renderCase(currentCaseData);

        // Pindah Tampilan ke Gameplay
        document.getElementById('view-homepage').classList.remove('active');
        document.getElementById('view-gameplay').classList.add('active');
        switchTab('panel-sidang', document.querySelectorAll('.nav-btn')[0]);

    } catch (e) {
        alert("Gagal memuat berkas kasus!");
        console.error(e);
    }
}

function switchTab(panelId, btnElement) {
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(panelId).classList.add('active');
    btnElement.classList.add('active');
}

function renderCase(c) {
    document.getElementById('case-title').innerText = c.title;
    document.getElementById('def-name').innerText = `${c.defendant.name} (${c.defendant.age} thn) - ${c.defendant.role}`;
    document.getElementById('case-desc').innerText = c.description;
    
    document.getElementById('pasal-title').innerText = `${c.charge.pasal}: ${c.charge.title}`;
    document.getElementById('pasal-text').innerText = `"${c.charge.text}"`;

    // Render Alat Bukti
    const evContainer = document.getElementById('evidence-container');
    evContainer.innerHTML = '';
    let evidenceOptionsHTML = `<option value="">-- Pilih Bukti Pembantah --</option>`;

    c.evidenceList.forEach((e) => {
        const div = document.createElement('div');
        div.className = 'evidence-item';
        div.innerHTML = `
            <strong>[${e.id}] ${e.type} - ${e.title}</strong>
            <p style="margin-top: 4px;">${e.content}</p>
            <span class="source-tag">📍 Asal: ${e.source}</span>
        `;
        evContainer.appendChild(div);
        evidenceOptionsHTML += `<option value="${e.id}">[${e.id}] ${e.title}</option>`;
    });

    // Render Uji Silang
    const crossContainer = document.getElementById('cross-container');
    crossContainer.innerHTML = '';

    c.crossExaminations.forEach((item) => {
        userActions[item.id] = { status: 'UNEXAMINED', isCorrect: false };

        const div = document.createElement('div');
        div.className = 'cross-item';
        div.innerHTML = `
            <p><strong>💬 ${item.speaker}:</strong> "<em>${item.statement}</em>"</p>
            <div style="margin-top: 8px;">
                <select id="select-${item.id}" class="select-evidence">${evidenceOptionsHTML}</select>
                <div style="display: flex; justify-content: space-between;">
                    <button class="btn-rebut" onclick="rebutStatement('${item.id}', '${item.contradictoryEvidenceId}')">KEBERATAN!</button>
                    <button class="btn-skip" onclick="skipStatement('${item.id}', '${item.contradictoryEvidenceId}')">LEWATI</button>
                </div>
            </div>
            <div id="feedback-${item.id}" class="rebuttal-feedback"></div>
        `;
        crossContainer.appendChild(div);
    });
}

function rebutStatement(crossId, correctEvidenceId) {
    const selectedEvId = document.getElementById(`select-${crossId}`).value;
    const feedbackEl = document.getElementById(`feedback-${crossId}`);

    if (!selectedEvId) {
        alert("Pilih alat bukti terlebih dahulu!");
        return;
    }

    if (correctEvidenceId && selectedEvId === correctEvidenceId) {
        const item = currentCaseData.crossExaminations.find(x => x.id === crossId);
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback success';
        feedbackEl.innerHTML = `<strong>⚡ KEBERATAN DITERIMA!</strong><br>${item.rebuttalText}`;
        userActions[crossId] = { status: 'REBUTTED', isCorrect: true };
    } else {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback error';
        feedbackEl.innerHTML = `<strong>❌ KEBERATAN DITOLAK!</strong><br>Alat bukti ini salah atau pernyataan ini tidak bohong.`;
        userActions[crossId] = { status: 'WRONG_REBUTTAL', isCorrect: false };
    }
}

function skipStatement(crossId, correctEvidenceId) {
    const feedbackEl = document.getElementById(`feedback-${crossId}`);

    if (!correctEvidenceId) {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback neutral';
        feedbackEl.innerHTML = `<strong>✅ KETERANGAN DITERIMA:</strong> Pernyataan jujur/wajar.`;
        userActions[crossId] = { status: 'SKIPPED_CORRECTLY', isCorrect: true };
    } else {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback error';
        feedbackEl.innerHTML = `<strong>⚠️ PERNYATAAN BOHONG DILEWATKAN!</strong>`;
        userActions[crossId] = { status: 'MISSED_LIE', isCorrect: false };
    }
}

function makeVerdict(userVerdict) {
    const c = currentCaseData;
    
    document.getElementById('verdict-action-card').style.display = 'none';

    const evalCard = document.getElementById('legal-evaluation-card');
    const evalContent = document.getElementById('legal-evaluation-content');
    evalCard.style.display = 'block';

    let isVerdictCorrect = (userVerdict === c.correctVerdict);
    
    // PENULISAN SKOR
    let earnedPoints = 0;
    if (isVerdictCorrect) earnedPoints += 50;
    
    let detailsHTML = `<ul style="margin-top: 8px; padding-left: 18px; font-size: 0.85rem; line-height: 1.5;">`;
    c.crossExaminations.forEach((item) => {
        let action = userActions[item.id];
        if (action.status === 'REBUTTED' && action.isCorrect) {
            earnedPoints += 20;
            detailsHTML += `<li style="color: #2ecc71;">[Berhasil] Berhasil mengungkap kebohongan (+20 Pts)</li>`;
        } else if (action.status === 'MISSED_LIE') {
            detailsHTML += `<li style="color: #e74c3c;">[Terlewat] Kebohongan gagal diungkap</li>`;
        } else if (action.status === 'WRONG_REBUTTAL') {
            earnedPoints -= 10;
            detailsHTML += `<li style="color: #e74c3c;">[Salah Sanggah] Keberatan keliru (-10 Pts)</li>`;
        }
    });
    detailsHTML += `</ul>`;

    // UPDATE LOCALSTORAGE SKOR
    judgeStats.score += Math.max(0, earnedPoints);
    judgeStats.casesCompleted += 1;
    if (isVerdictCorrect) judgeStats.correctVerdicts += 1;
    
    judgeStats.history.unshift({
        title: c.title,
        verdict: userVerdict === 'GUILTY' ? 'Bersalah' : 'Bebas',
        isCorrect: isVerdictCorrect
    });
    
    localStorage.setItem('judgeStats', JSON.stringify(judgeStats));

    let verdictHTML = isVerdictCorrect 
        ? `<p style="color: #2ecc71; font-weight: bold;">✅ VONIS TEPAT (${userVerdict === 'GUILTY' ? 'BERSALAH' : 'BEBAS'})</p>`
        : `<p style="color: #e74c3c; font-weight: bold;">❌ VONIS SALAH / CACAT HUKUM (Seharusnya ${c.correctVerdict})</p>`;

    evalContent.innerHTML = `${verdictHTML}<p style="font-size: 0.85rem; margin-top: 6px;">${c.explanation}</p>${detailsHTML}<p style="margin-top: 10px; font-weight: bold; color: var(--gold);">Poin Reputasi Diperoleh: +${earnedPoints}</p>`;

    // Siapkan data berita Koran
    const newsData = (userVerdict === 'GUILTY') ? c.newsOutcome.guilty : c.newsOutcome.innocent;
    document.getElementById('news-headline').innerText = newsData.headline;
    document.getElementById('news-snippet').innerText = newsData.snippet;
    document.getElementById('public-opinion').innerText = newsData.publicOpinion;

    evalCard.scrollIntoView({ behavior: 'smooth' });
}

function openNewsModal() { document.getElementById('news-modal').style.display = 'flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
