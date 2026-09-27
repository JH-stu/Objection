let currentCaseData = null;

async function loadCaseData() {
    try {
        const response = await fetch('cases/budi-santoso.json');
        currentCaseData = await response.json();
        renderCase(currentCaseData);
    } catch (e) {
        console.error("Gagal membaca berkas kasus:", e);
    }
}

function renderCase(c) {
    document.getElementById('case-title').innerText = `${c.title} (${c.category})`;
    document.getElementById('def-name').innerText = `${c.defendant.name} (${c.defendant.age} thn) - ${c.defendant.role}`;
    document.getElementById('pasal-title').innerText = `${c.charge.pasal}: ${c.charge.title}`;
    document.getElementById('pasal-text').innerText = `"${c.charge.text}"`;

    const evContainer = document.getElementById('evidence-container');
    evContainer.innerHTML = '';
    
    let evidenceOptionsHTML = `<option value="">-- Pilih Bukti Pembantah --</option>`;

    c.evidenceList.forEach((e) => {
        const div = document.createElement('div');
        div.className = 'evidence-item';
        div.innerHTML = `
            <div>
                <strong>[${e.id}] ${e.type} - ${e.title}</strong>
                <span class="source-tag">📍 Asal Bukti: ${e.source}</span>
            </div>
            <p style="margin-top: 5px;">${e.content}</p>
        `;
        evContainer.appendChild(div);

        evidenceOptionsHTML += `<option value="${e.id}">[${e.id}] ${e.title}</option>`;
    });

    const crossContainer = document.getElementById('cross-container');
    crossContainer.innerHTML = '';

    c.crossExaminations.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'cross-item';
        div.innerHTML = `
            <p><strong>💬 ${item.speaker}:</strong> "<em>${item.statement}</em>"</p>
            <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <select id="select-${item.id}" class="select-evidence">${evidenceOptionsHTML}</select>
                <button class="btn-rebut" onclick="rebutStatement('${item.id}', '${item.contradictoryEvidenceId}')">KEBERATAN!</button>
                <button class="btn-skip" onclick="skipStatement('${item.id}', '${item.contradictoryEvidenceId}')">LEWATI / TERIMA</button>
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
        feedbackEl.innerHTML = `<strong>⚡ OBJECTION / KEBERATAN DITERIMA!</strong><br>${item.rebuttalText}`;
    } else {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback error';
        feedbackEl.innerHTML = `<strong>❌ KEBERATAN DITOLAK!</strong><br>Alat bukti ini tidak mematahkan kesaksian ini atau pernyataan ini tidak bohong.`;
    }
}

function skipStatement(crossId, correctEvidenceId) {
    const feedbackEl = document.getElementById(`feedback-${crossId}`);

    if (!correctEvidenceId) {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback neutral';
        feedbackEl.innerHTML = `<strong>✅ KETERANGAN DITERIMA:</strong> Pernyataan jujur/wajar dan tidak bertentangan dengan alat bukti sah yang ada.`;
    } else {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'rebuttal-feedback error';
        feedbackEl.innerHTML = `<strong>⚠️ PERNYATAAN BOHONG DILEWATKAN:</strong> Ada bukti sah yang sebenarnya dapat mematahkan kebohongan ini!`;
    }
}

function makeVerdict(userVerdict) {
    const c = currentCaseData;
    document.getElementById('action-panel').style.display = 'none';
    
    const newsSection = document.getElementById('news-section');
    newsSection.style.display = 'block';

    const newsData = (userVerdict === 'GUILTY') ? c.newsOutcome.guilty : c.newsOutcome.innocent;

    document.getElementById('news-headline').innerText = newsData.headline;
    document.getElementById('news-snippet').innerText = newsData.snippet;
    document.getElementById('public-opinion').innerText = newsData.publicOpinion;

    const verdictEvaluation = document.getElementById('verdict-evaluation');
    if (userVerdict === c.correctVerdict) {
        verdictEvaluation.innerHTML = `<h3 style="color: #2ecc71;">⚖️ VONIS SESUAI HUKUM (KUHAP)</h3><p>${c.explanation}</p>`;
    } else {
        verdictEvaluation.innerHTML = `<h3 style="color: #e74c3c;">❌ CACAT HUKUM / DIBATALKAN MAHKAMAH AGUNG</h3><p>${c.explanation}</p>`;
    }
}

window.onload = loadCaseData;

