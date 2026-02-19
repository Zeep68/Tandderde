/* =========================================
   F1 POULE 2025 - Applicatie Logica
   =========================================
   Data wordt lokaal opgeslagen in localStorage.
   Exporteer/importeer om data te back-uppen of te delen.
   ========================================= */

// ---- CONSTANTEN ----

const ADMIN_PASSWORD = 'f1admin'; // Wijzig dit naar eigen wachtwoord

const DRIVERS_2025 = [
    'Max Verstappen',
    'Liam Lawson',
    'Lewis Hamilton',
    'Charles Leclerc',
    'George Russell',
    'Kimi Antonelli',
    'Lando Norris',
    'Oscar Piastri',
    'Fernando Alonso',
    'Lance Stroll',
    'Esteban Ocon',
    'Oliver Bearman',
    'Pierre Gasly',
    'Jack Doohan',
    'Nico Hulkenberg',
    'Gabriel Bortoleto',
    'Carlos Sainz',
    'Alexander Albon',
    'Yuki Tsunoda',
    'Isack Hadjar',
];

// Punten per positieverschil (index = verschil in posities)
const SCORE_TABLE = [10, 6, 3, 1]; // index 0 = exact, 1 = 1 naast, 2 = 2 naast, 3 = 3 naast

// ---- STATE ----

let isAdmin = false;

// Haal data op uit localStorage
function getData() {
    try {
        return JSON.parse(localStorage.getItem('f1poule_data')) || { races: [], participants: [] };
    } catch (e) {
        return { races: [], participants: [] };
    }
}

function saveData(data) {
    localStorage.setItem('f1poule_data', JSON.stringify(data));
}

// ---- NAVIGATIE ----

function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    document.getElementById('view-' + name).classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');

    if (name === 'races') renderRacesView();
    if (name === 'predict') renderPredictView();
    if (name === 'stand') renderStandingsView();
    if (name === 'admin') renderAdminView();
}

// ---- RACES VIEW ----

function renderRacesView() {
    const data = getData();
    const nextRaceSection = document.getElementById('next-race-section');
    const allRacesList = document.getElementById('all-races-list');

    const now = new Date();
    const upcoming = data.races
        .filter(r => r.status !== 'finished')
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextRace = upcoming[0] || null;

    if (nextRace) {
        nextRaceSection.innerHTML = `
            <div class="next-race-label">&#128681; Volgende Race</div>
            <div class="race-card next-race">
                <div class="race-card-info">
                    <div class="race-card-name">${nextRace.name}</div>
                    <div class="race-card-date">${formatDate(nextRace.date)}</div>
                </div>
                <span class="race-badge badge-active">Actief</span>
            </div>`;
    } else {
        nextRaceSection.innerHTML = '';
    }

    if (data.races.length === 0) {
        allRacesList.innerHTML = '<p class="hint">Nog geen races aangemaakt. Ga naar &#9881; Admin om een race toe te voegen.</p>';
        return;
    }

    const sorted = [...data.races].sort((a, b) => new Date(a.date) - new Date(b.date));
    allRacesList.innerHTML = sorted.map(race => {
        const predCount = Object.keys(race.predictions || {}).length;
        const badgeClass = race.status === 'finished' ? 'badge-finished' : 'badge-upcoming';
        const badgeLabel = race.status === 'finished' ? 'Afgelopen' : 'Open';
        return `<div class="race-card">
            <div class="race-card-info">
                <div class="race-card-name">${race.name}</div>
                <div class="race-card-date">${formatDate(race.date)} &middot; ${predCount} voorspelling${predCount !== 1 ? 'en' : ''}</div>
            </div>
            <span class="race-badge ${badgeClass}">${badgeLabel}</span>
        </div>`;
    }).join('');
}

// ---- PREDICT VIEW ----

let predictState = {
    raceId: null,
    playerName: '',
    selected: [], // top 10 array of driver names
};

function renderPredictView() {
    const data = getData();
    const openRaces = data.races.filter(r => r.status !== 'finished');
    const buttonsEl = document.getElementById('predict-race-buttons');
    const formEl = document.getElementById('predict-form-area');

    if (openRaces.length === 0) {
        buttonsEl.innerHTML = '<p class="hint">Er zijn momenteel geen open races om een voorspelling voor in te dienen.</p>';
        formEl.innerHTML = '';
        return;
    }

    buttonsEl.innerHTML = openRaces.map(r => `
        <button class="race-select-btn ${predictState.raceId === r.id ? 'selected' : ''}" onclick="selectPredictRace('${r.id}')">
            ${r.name} <span style="font-size:0.78rem;color:#aaa;font-weight:400;">${formatDate(r.date)}</span>
        </button>`).join('');

    if (predictState.raceId) {
        renderPredictForm(formEl, data);
    } else {
        formEl.innerHTML = '';
    }
}

function selectPredictRace(raceId) {
    predictState.raceId = raceId;
    predictState.selected = [];
    renderPredictView();
}

function renderPredictForm(container, data) {
    const race = data.races.find(r => r.id === predictState.raceId);
    if (!race) return;

    const drivers = race.drivers || DRIVERS_2025;
    const available = drivers.filter(d => !predictState.selected.includes(d));

    container.innerHTML = `
        <div class="card" style="margin-top:10px">
            <div class="section-title">Jouw Naam</div>
            <input type="text" id="predict-player-name" class="form-input" placeholder="Vul je naam in..."
                value="${predictState.playerName}" oninput="predictState.playerName = this.value">
        </div>
        <div class="card">
            <div class="section-title">${race.name} &mdash; Kies je Top 10</div>
            <p class="hint" style="margin-bottom:10px">Tik een rijder aan om hem toe te voegen aan je top 10. Tik een positie aan om de rijder te verwijderen.</p>
            <div class="driver-picker">
                <div class="driver-pool-panel">
                    <div class="panel-label">Beschikbare rijders</div>
                    ${available.map(d => `
                        <div class="driver-chip ${predictState.selected.includes(d) ? 'selected' : ''}"
                             onclick="addToPrediction('${escapeHtml(d)}')">
                            ${d}
                        </div>`).join('')}
                    ${available.length === 0 ? '<p class="hint">Alle 10 posities gevuld.</p>' : ''}
                </div>
                <div class="top10-panel">
                    <div class="panel-label">Jouw Top 10</div>
                    ${Array.from({length: 10}, (_, i) => {
                        const driver = predictState.selected[i];
                        const posClass = i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : '';
                        return driver
                            ? `<div class="top10-slot filled" onclick="removeFromPrediction(${i})">
                                <span class="slot-number ${posClass}">P${i+1}</span>
                                <span class="slot-driver">${driver}</span>
                                <span class="slot-remove">&#10005;</span>
                               </div>`
                            : `<div class="top10-slot">
                                <span class="slot-number ${posClass}">P${i+1}</span>
                                <span class="slot-empty">leeg</span>
                               </div>`;
                    }).join('')}
                </div>
            </div>
            ${predictState.selected.length === 10
                ? `<button class="btn-success" style="margin-top:12px" onclick="submitPrediction()">&#10003; Voorspelling Indienen</button>`
                : `<p class="hint" style="margin-top:10px">Nog ${10 - predictState.selected.length} rijder${10 - predictState.selected.length !== 1 ? 's' : ''} te kiezen.</p>`
            }
        </div>`;
}

function addToPrediction(driver) {
    if (predictState.selected.length >= 10) return;
    if (predictState.selected.includes(driver)) return;
    predictState.selected.push(driver);
    renderPredictView();
}

function removeFromPrediction(index) {
    predictState.selected.splice(index, 1);
    renderPredictView();
}

function submitPrediction() {
    const name = predictState.playerName.trim();
    if (!name) { showToast('Vul eerst je naam in.', 'error'); return; }
    if (predictState.selected.length !== 10) { showToast('Kies precies 10 rijders.', 'error'); return; }

    const data = getData();
    const race = data.races.find(r => r.id === predictState.raceId);
    if (!race) return;

    if (!race.predictions) race.predictions = {};
    race.predictions[name] = [...predictState.selected];
    saveData(data);

    showToast('Voorspelling opgeslagen voor ' + name + '!', 'success');
    predictState = { raceId: null, playerName: '', selected: [] };
    renderPredictView();
}

// ---- STANDINGS VIEW ----

function renderStandingsView() {
    const data = getData();
    const content = document.getElementById('standings-content');
    const detail = document.getElementById('race-detail-section');

    // Calculate total standings
    const totals = {}; // { playerName: { total, races: { raceId: score } } }
    data.participants.forEach(p => { totals[p] = { total: 0, races: {} }; });

    data.races.forEach(race => {
        if (race.status !== 'finished' || !race.results) return;
        const scores = race.scores || {};
        Object.entries(scores).forEach(([player, score]) => {
            if (!totals[player]) totals[player] = { total: 0, races: {} };
            totals[player].total += score;
            totals[player].races[race.id] = score;
        });
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
    const finishedRaces = data.races.filter(r => r.status === 'finished');

    if (sorted.length === 0) {
        content.innerHTML = '<p class="hint">Nog geen deelnemers of scores. Voeg deelnemers toe via Admin en speel een race af.</p>';
        detail.innerHTML = '';
        return;
    }

    const raceHeaders = finishedRaces.map(r => `<th title="${r.name}">${abbreviate(r.name)}</th>`).join('');

    content.innerHTML = `
        <div style="overflow-x:auto">
        <table class="standings-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Deelnemer</th>
                    ${raceHeaders}
                    <th>Totaal</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(([player, info], idx) => {
                    const raceScores = finishedRaces.map(r =>
                        `<td>${info.races[r.id] !== undefined ? info.races[r.id] + ' pts' : '-'}</td>`
                    ).join('');
                    return `<tr class="rank-${idx+1}">
                        <td>${idx + 1}</td>
                        <td>${player}</td>
                        ${raceScores}
                        <td class="pts-cell">${info.total}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        </div>`;

    // Show per-race detail
    if (finishedRaces.length > 0) {
        detail.innerHTML = finishedRaces.map(race => {
            const scoresForRace = Object.entries(race.scores || {})
                .sort((a, b) => b[1] - a[1]);
            return `
                <div class="card" style="margin-top:14px">
                    <div class="section-title">${race.name} &mdash; ${formatDate(race.date)}</div>
                    ${race.results ? `
                        <p class="hint" style="margin-bottom:8px">Uitslag:</p>
                        ${race.results.map((d, i) => {
                            const posClass = i < 3 ? 'p' + (i+1) : '';
                            return `<div class="race-result-row">
                                <span class="result-pos ${posClass}">P${i+1}</span>
                                <span>${d}</span>
                            </div>`;
                        }).join('')}
                        <p class="hint" style="margin:10px 0 6px">Scores:</p>
                        ${scoresForRace.map(([p, s], i) =>
                            `<div class="race-result-row">
                                <span class="result-pos ${i < 3 ? 'p'+(i+1) : ''}">${i+1}.</span>
                                <span>${p}</span>
                                <span class="pts-cell" style="margin-left:auto">${s} pts</span>
                            </div>`
                        ).join('')}
                    ` : '<p class="hint">Nog geen uitslag ingevoerd.</p>'}
                </div>`;
        }).join('');
    } else {
        detail.innerHTML = '';
    }
}

// ---- ADMIN VIEW ----

function renderAdminView() {
    if (isAdmin) {
        document.getElementById('admin-login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        populateAdminPanel();
    } else {
        document.getElementById('admin-login-section').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
    }
}

function adminLogin() {
    const pwd = document.getElementById('admin-pwd-input').value;
    if (pwd === ADMIN_PASSWORD) {
        isAdmin = true;
        renderAdminView();
        showToast('Welkom, admin!', 'success');
    } else {
        showToast('Ongeldig wachtwoord.', 'error');
    }
}

function populateAdminPanel() {
    const data = getData();

    // Participants list
    const partList = document.getElementById('participants-list');
    partList.innerHTML = data.participants.length === 0
        ? '<p class="hint">Nog geen deelnemers.</p>'
        : data.participants.map((p, i) => `
            <div class="participant-item">
                <span>${p}</span>
                <button class="btn-small red" onclick="removeParticipant(${i})">Verwijder</button>
            </div>`).join('');

    // Race select dropdowns
    const raceOptions = ['<option value="">Selecteer race...</option>',
        ...data.races.map(r => `<option value="${r.id}">${r.name}</option>`)].join('');

    ['admin-race-select', 'results-race-select', 'whatsapp-race-select', 'overview-race-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = raceOptions;
    });

    // Participant options
    const partOptions = ['<option value="">Selecteer deelnemer...</option>',
        ...data.participants.map(p => `<option value="${escapeHtml(p)}">${p}</option>`)].join('');
    const partSelect = document.getElementById('admin-participant-select');
    if (partSelect) partSelect.innerHTML = partOptions;

    // Admin races list
    renderAdminRacesList();
}

function renderAdminRacesList() {
    const data = getData();
    const el = document.getElementById('admin-races');
    if (!el) return;

    if (data.races.length === 0) {
        el.innerHTML = '<p class="hint">Nog geen races.</p>';
        return;
    }

    el.innerHTML = data.races.map(r => `
        <div class="admin-race-item">
            <div>
                <div class="admin-race-name">${r.name}</div>
                <div class="admin-race-date">${formatDate(r.date)} &middot; ${r.status === 'finished' ? 'Afgelopen' : 'Open'}</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">
                ${r.status !== 'finished' ? `<button class="btn-small green" onclick="markRaceFinished('${r.id}')">Afsluiten</button>` : ''}
                <button class="btn-small red" onclick="deleteRace('${r.id}')">Wissen</button>
            </div>
        </div>`).join('');
}

// ---- RACE MANAGEMENT ----

function createRace() {
    const name = document.getElementById('new-race-name').value.trim();
    const date = document.getElementById('new-race-date').value;
    if (!name) { showToast('Vul een racenaam in.', 'error'); return; }
    if (!date) { showToast('Vul een datum in.', 'error'); return; }

    const data = getData();
    const race = {
        id: 'race_' + Date.now(),
        name,
        date,
        status: 'upcoming',
        drivers: [...DRIVERS_2025],
        predictions: {},
        results: null,
        scores: {},
    };
    data.races.push(race);
    saveData(data);

    document.getElementById('new-race-name').value = '';
    document.getElementById('new-race-date').value = '';
    populateAdminPanel();
    showToast('Race "' + name + '" aangemaakt!', 'success');
}

function deleteRace(raceId) {
    if (!confirm('Weet je zeker dat je deze race wilt verwijderen?')) return;
    const data = getData();
    data.races = data.races.filter(r => r.id !== raceId);
    saveData(data);
    populateAdminPanel();
    showToast('Race verwijderd.', 'success');
}

function markRaceFinished(raceId) {
    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;
    race.status = 'finished';
    saveData(data);
    populateAdminPanel();
    showToast('Race afgesloten.', 'success');
}

// ---- PARTICIPANTS ----

function addParticipant() {
    const input = document.getElementById('new-participant-name');
    const name = input.value.trim();
    if (!name) { showToast('Vul een naam in.', 'error'); return; }

    const data = getData();
    if (data.participants.includes(name)) { showToast('Deelnemer bestaat al.', 'error'); return; }
    data.participants.push(name);
    saveData(data);
    input.value = '';
    populateAdminPanel();
    showToast(name + ' toegevoegd!', 'success');
}

function removeParticipant(index) {
    const data = getData();
    const name = data.participants[index];
    if (!confirm('Verwijder deelnemer "' + name + '"?')) return;
    data.participants.splice(index, 1);
    saveData(data);
    populateAdminPanel();
    showToast('Deelnemer verwijderd.', 'success');
}

// ---- ADMIN PREDICTION ENTRY ----

let adminPredictState = { selected: [] };

function loadAdminPredictForm() {
    const raceId = document.getElementById('admin-race-select').value;
    const player = document.getElementById('admin-participant-select').value;
    adminPredictState.selected = [];

    const driversEl = document.getElementById('admin-predict-drivers');
    const top10El = document.getElementById('admin-predict-top10');
    const saveBtn = document.getElementById('save-prediction-btn');

    if (!raceId || !player) {
        driversEl.innerHTML = '';
        top10El.innerHTML = '';
        saveBtn.style.display = 'none';
        return;
    }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;

    // If there's an existing prediction, pre-fill it
    if (race.predictions && race.predictions[player]) {
        adminPredictState.selected = [...race.predictions[player]];
    }

    saveBtn.style.display = 'block';
    renderAdminPickerUI(race.drivers || DRIVERS_2025, driversEl, top10El, adminPredictState, () => {
        renderAdminPickerUI(race.drivers || DRIVERS_2025, driversEl, top10El, adminPredictState, null);
    });
}

function renderAdminPickerUI(drivers, driversEl, top10El, state, onChange) {
    const available = drivers.filter(d => !state.selected.includes(d));

    driversEl.innerHTML = `
        <div class="driver-picker" style="margin-top:10px">
            <div class="driver-pool-panel">
                <div class="panel-label">Beschikbare rijders</div>
                ${available.map(d => `
                    <div class="driver-chip" onclick="adminAddDriver('${escapeHtml(d)}')">
                        ${d}
                    </div>`).join('')}
                ${available.length === 0 ? '<p class="hint">Alle 10 posities gevuld.</p>' : ''}
            </div>
        </div>`;

    top10El.innerHTML = Array.from({length: 10}, (_, i) => {
        const driver = state.selected[i];
        const posClass = i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : '';
        return driver
            ? `<div class="top10-slot filled" onclick="adminRemoveDriver(${i})">
                <span class="slot-number ${posClass}">P${i+1}</span>
                <span class="slot-driver">${driver}</span>
                <span class="slot-remove">&#10005;</span>
               </div>`
            : `<div class="top10-slot">
                <span class="slot-number ${posClass}">P${i+1}</span>
                <span class="slot-empty">leeg</span>
               </div>`;
    }).join('');
}

function adminAddDriver(driver) {
    if (adminPredictState.selected.length >= 10) return;
    if (adminPredictState.selected.includes(driver)) return;
    adminPredictState.selected.push(driver);
    loadAdminPredictForm();
}

function adminRemoveDriver(index) {
    adminPredictState.selected.splice(index, 1);
    loadAdminPredictForm();
}

function saveAdminPrediction() {
    const raceId = document.getElementById('admin-race-select').value;
    const player = document.getElementById('admin-participant-select').value;
    if (!raceId || !player) { showToast('Selecteer een race en deelnemer.', 'error'); return; }
    if (adminPredictState.selected.length !== 10) { showToast('Kies precies 10 rijders.', 'error'); return; }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;
    if (!race.predictions) race.predictions = {};
    race.predictions[player] = [...adminPredictState.selected];
    saveData(data);
    adminPredictState.selected = [];
    loadAdminPredictForm();
    showToast('Voorspelling van ' + player + ' opgeslagen!', 'success');
}

// ---- RESULTS ENTRY ----

let resultsState = { selected: [] };

function loadResultsForm() {
    const raceId = document.getElementById('results-race-select').value;
    resultsState.selected = [];

    const driversEl = document.getElementById('results-drivers-area');
    const top10El = document.getElementById('results-top10-area');
    const saveBtn = document.getElementById('save-results-btn');

    if (!raceId) {
        driversEl.innerHTML = '';
        top10El.innerHTML = '';
        saveBtn.style.display = 'none';
        return;
    }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;

    if (race.results) {
        resultsState.selected = [...race.results];
    }

    saveBtn.style.display = 'block';
    renderResultsUI(race.drivers || DRIVERS_2025, driversEl, top10El);
}

function renderResultsUI(drivers, driversEl, top10El) {
    const available = drivers.filter(d => !resultsState.selected.includes(d));

    driversEl.innerHTML = `
        <div class="driver-picker" style="margin-top:10px">
            <div class="driver-pool-panel">
                <div class="panel-label">Rijders (klik om toe te voegen)</div>
                ${available.map(d => `
                    <div class="driver-chip" onclick="resultsAddDriver('${escapeHtml(d)}')">
                        ${d}
                    </div>`).join('')}
                ${available.length === 0 ? '<p class="hint">Alle 10 posities ingevuld.</p>' : ''}
            </div>
        </div>`;

    top10El.innerHTML = Array.from({length: 10}, (_, i) => {
        const driver = resultsState.selected[i];
        const posClass = i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : '';
        return driver
            ? `<div class="top10-slot filled" onclick="resultsRemoveDriver(${i})">
                <span class="slot-number ${posClass}">P${i+1}</span>
                <span class="slot-driver">${driver}</span>
                <span class="slot-remove">&#10005;</span>
               </div>`
            : `<div class="top10-slot">
                <span class="slot-number ${posClass}">P${i+1}</span>
                <span class="slot-empty">leeg</span>
               </div>`;
    }).join('');
}

function resultsAddDriver(driver) {
    if (resultsState.selected.length >= 10) return;
    if (resultsState.selected.includes(driver)) return;
    resultsState.selected.push(driver);

    const data = getData();
    const raceId = document.getElementById('results-race-select').value;
    const race = data.races.find(r => r.id === raceId);
    renderResultsUI(race ? race.drivers || DRIVERS_2025 : DRIVERS_2025,
        document.getElementById('results-drivers-area'),
        document.getElementById('results-top10-area'));
}

function resultsRemoveDriver(index) {
    resultsState.selected.splice(index, 1);

    const data = getData();
    const raceId = document.getElementById('results-race-select').value;
    const race = data.races.find(r => r.id === raceId);
    renderResultsUI(race ? race.drivers || DRIVERS_2025 : DRIVERS_2025,
        document.getElementById('results-drivers-area'),
        document.getElementById('results-top10-area'));
}

function saveResults() {
    const raceId = document.getElementById('results-race-select').value;
    if (!raceId) { showToast('Selecteer een race.', 'error'); return; }
    if (resultsState.selected.length !== 10) { showToast('Voer de volledige top 10 in.', 'error'); return; }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;

    race.results = [...resultsState.selected];
    race.status = 'finished';
    race.scores = calculateAllScores(race);
    saveData(data);
    resultsState.selected = [];
    loadResultsForm();
    populateAdminPanel();
    showToast('Uitslag opgeslagen! Scores berekend.', 'success');
}

// ---- SCORE CALCULATION ----

function calculateScore(prediction, results) {
    let total = 0;
    prediction.forEach((driver, predPos) => {
        const actualPos = results.indexOf(driver);
        if (actualPos === -1) return; // Not in top 10
        const diff = Math.abs(predPos - actualPos);
        if (diff < SCORE_TABLE.length) {
            total += SCORE_TABLE[diff];
        }
    });
    return total;
}

function calculateAllScores(race) {
    const scores = {};
    if (!race.results || !race.predictions) return scores;
    Object.entries(race.predictions).forEach(([player, prediction]) => {
        scores[player] = calculateScore(prediction, race.results);
    });
    return scores;
}

// ---- WHATSAPP SHARING ----

function shareStandings() {
    const data = getData();
    const totals = {};
    data.participants.forEach(p => { totals[p] = 0; });

    data.races.forEach(race => {
        if (race.status !== 'finished' || !race.scores) return;
        Object.entries(race.scores).forEach(([player, score]) => {
            if (!totals[player]) totals[player] = 0;
            totals[player] += score;
        });
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const medals = ['🥇', '🥈', '🥉'];

    let msg = '🏎️ *F1 Poule 2025 - Klassement*\n\n';
    sorted.forEach(([player, pts], i) => {
        const medal = medals[i] || `${i + 1}.`;
        msg += `${medal} ${player}: *${pts} punten*\n`;
    });

    const finishedCount = data.races.filter(r => r.status === 'finished').length;
    msg += `\n_Na ${finishedCount} race${finishedCount !== 1 ? 's' : ''}_`;

    openWhatsApp(msg);
}

function shareRaceInvite() {
    const raceId = document.getElementById('whatsapp-race-select').value;
    if (!raceId) { showToast('Selecteer een race.', 'error'); return; }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race) return;

    const drivers = (race.drivers || DRIVERS_2025);
    const top20 = drivers.slice(0, 20);

    let msg = `🏎️ *F1 Poule - ${race.name}*\n`;
    msg += `📅 ${formatDate(race.date)}\n\n`;
    msg += `Stuur jouw *Top 10* voorspelling!\n\n`;
    msg += `*Rijders 2025:*\n`;
    top20.forEach((d, i) => { msg += `${i + 1}. ${d}\n`; });
    msg += `\n_Reageer met je top 10 volgorde (bijv: 1. Verstappen, 2. Norris...)_`;

    openWhatsApp(msg);
}

function shareRaceScores() {
    const raceId = document.getElementById('whatsapp-race-select').value;
    if (!raceId) { showToast('Selecteer een race.', 'error'); return; }

    const data = getData();
    const race = data.races.find(r => r.id === raceId);
    if (!race || !race.results) { showToast('Voer eerst de uitslag in.', 'error'); return; }

    const scores = race.scores || {};
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const medals = ['🥇', '🥈', '🥉'];

    let msg = `🏎️ *${race.name} - Uitslag*\n\n`;
    msg += `*Finish volgorde:*\n`;
    race.results.forEach((d, i) => { msg += `P${i + 1}: ${d}\n`; });

    msg += `\n*Poule scores:*\n`;
    sorted.forEach(([player, pts], i) => {
        const medal = medals[i] || `${i + 1}.`;
        msg += `${medal} ${player}: ${pts} punten\n`;
    });

    openWhatsApp(msg);
}

function openWhatsApp(text) {
    const encoded = encodeURIComponent(text);
    window.open('https://wa.me/?text=' + encoded, '_blank');
}

// ---- EXPORT / IMPORT ----

function exportData() {
    const data = getData();
    const json = JSON.stringify(data, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f1poule_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data geexporteerd!', 'success');
}

function importData() {
    const ta = document.getElementById('import-textarea');
    const btn = document.getElementById('import-confirm-btn');
    ta.style.display = ta.style.display === 'none' ? 'block' : 'none';
    btn.style.display = btn.style.display === 'none' ? 'block' : 'none';
}

function confirmImport() {
    const json = document.getElementById('import-textarea').value.trim();
    try {
        const data = JSON.parse(json);
        if (!data.races || !data.participants) throw new Error('Ongeldig formaat');
        saveData(data);
        document.getElementById('import-textarea').style.display = 'none';
        document.getElementById('import-confirm-btn').style.display = 'none';
        document.getElementById('import-textarea').value = '';
        populateAdminPanel();
        showToast('Data succesvol geimporteerd!', 'success');
    } catch (e) {
        showToast('Fout: ' + e.message, 'error');
    }
}

// ---- HELPERS ----

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function abbreviate(name) {
    // Take first word or first 3 chars
    return name.split(' ')[0].slice(0, 6);
}

function escapeHtml(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
    renderRacesView();

    // Allow Enter key in admin login
    const pwdInput = document.getElementById('admin-pwd-input');
    if (pwdInput) {
        pwdInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') adminLogin();
        });
    }
});
