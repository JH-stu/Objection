let currentCaseData = null;
let userActions = {}; // Mengunci status setiap poin cross-exam

async function loadCaseData() {
    try {
        const response = await fetch('cases/budi-santoso.json');
        currentCaseData = await response.json();
        renderCase(currentCaseData);
    } catch (e) {
        console.error("Gagal membaca berkas kasus:", e);
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
    
    // Tampilkan Card Evaluasi Hukum
    const evalCard = document.getElementById('legal-evaluation-card');
    const evalContent = document.getElementById('legal-evaluation-content');
    evalCard.style.display = 'block';

    let isVerdictCorrect = (userVerdict === c.correctVerdict);
    let verdictHTML = isVerdictCorrect 
        ? `<p style="color: #2ecc71; font-weight: bold;">✅ VONIS TEPAT: ${userVerdict === 'GUILTY' ? 'BERSALAH' : 'BEBAS'}</p>`
        : `<p style="color: #e74c3c; font-weight: bold;">❌ VONIS SALAH / CACAT HUKUM (Seharusnya ${c.correctVerdict})</p>`;

    let detailsHTML = `<ul style="margin-top: 8px; padding-left: 18px; font-size: 0.85rem; line-height: 1.5;">`;
    
    c.crossExaminations.forEach((item) => {
        let action = userActions[item.id];
        if (action.status === 'REBUTTED' && action.isCorrect) {
            detailsHTML += `<li style="color: #2ecc71;">[Berhasil] Berhasil mengungkap kebohongan: <em>"${item.speaker}"</em></li>`;
        } else if (action.status === 'MISSED_LIE') {
            detailsHTML += `<li style="color: #e74c3c;">[Terlewat] Kebohongan gagal diungkap: <em>"${item.speaker}"</em></li>`;
        } else if (action.status === 'WRONG_REBUTTAL') {
            detailsHTML += `<li style="color: #e74c3c;">[Salah Sanggah] Keberatan keliru pada: <em>"${item.speaker}"</em></li>`;
        }
    });
    detailsHTML += `</ul>`;

    evalContent.innerHTML = `${verdictHTML}<p style="font-size: 0.85rem; margin-top: 6px;">${c.explanation}</p>${detailsHTML}`;

    // Siapkan data berita untuk Koran
    const newsData = (userVerdict === 'GUILTY') ? c.newsOutcome.guilty : c.newsOutcome.innocent;
    document.getElementById('news-headline').innerText = newsData.headline;
    document.getElementById('news-snippet').innerText = newsData.snippet;
    document.getElementById('public-opinion').innerText = newsData.publicOpinion;

    evalCard.scrollIntoView({ behavior: 'smooth' });
}

function openNewsModal() {
    document.getElementById('news-modal').style.display = 'flex';
}

function closeNewsModal() {
    document.getElementById('news-modal').style.display = 'none';
}

window.onload = loadCaseData;
