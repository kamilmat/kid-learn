const SOURCES = [
  { file: 'letters.json', group: 'Litery' },
  { file: 'words.json', group: 'Słowa-i-asocjacje' }, // splitujemy w runtime
  { file: 'ui-strings.json', group: 'UI' },
];

const state = {
  keys: [],          // [{ key, text, group, status }]
  activeKey: null,
  filterGroup: 'all',
  filterUnrecorded: false,
  dirHandle: null,
  // recording
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  currentBlob: null,
  currentBlobUrl: null,
  isRecording: false,
  recordingKey: null,
};

function clearBlobUrl() {
  if (state.currentBlobUrl) {
    URL.revokeObjectURL(state.currentBlobUrl);
    state.currentBlobUrl = null;
  }
}

async function loadSources() {
  const all = [];
  for (const { file, group } of SOURCES) {
    const res = await fetch(`../../audio-source/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
    const json = await res.json();
    for (const [key, text] of Object.entries(json)) {
      // words.json zawiera zarówno word-* jak assoc-* — rozdzielamy
      let g = group;
      if (group === 'Słowa-i-asocjacje') {
        g = key.startsWith('assoc-') ? 'Asocjacje' : 'Słowa';
      }
      all.push({ key, text, group: g, status: 'unrecorded' });
    }
  }
  return all;
}

function renderKeyList() {
  const container = document.getElementById('key-list');
  const filtered = state.keys.filter((k) => {
    if (state.filterGroup !== 'all' && k.group !== state.filterGroup) return false;
    if (state.filterUnrecorded && k.status !== 'unrecorded') return false;
    return true;
  });
  const groups = {};
  for (const k of filtered) {
    (groups[k.group] ??= []).push(k);
  }
  const html = Object.entries(groups).map(([group, items]) => `
    <div class="group">
      <h3>${group} (${items.length})</h3>
      ${items.map((it) => `
        <div class="key-row ${it.key === state.activeKey ? 'active' : ''}" data-key="${it.key}">
          <span class="status">${statusIcon(it.status)}</span>
          <span class="key">${it.key}</span>
          <span class="text">${escapeHtml(it.text)}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
  container.innerHTML = html || '<p class="hint">Brak kluczy spełniających filtr.</p>';
  container.querySelectorAll('.key-row').forEach((row) => {
    row.addEventListener('click', () => selectKey(row.dataset.key));
  });
  updateProgress();
}

function statusIcon(s) {
  if (s === 'recorded') return '✅';
  if (s === 'recording') return '⏺';
  if (s === 'preview') return '▶';
  return '⬜';
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function updateProgress() {
  const recorded = state.keys.filter((k) => k.status === 'recorded').length;
  const total = state.keys.length;
  document.getElementById('progress-count').textContent = `${recorded} / ${total}`;
}

function selectKey(key) {
  clearBlobUrl();
  state.activeKey = key;
  renderKeyList();
  renderActivePane();
}

function renderActivePane() {
  const pane = document.getElementById('active-pane');
  const item = state.keys.find((k) => k.key === state.activeKey);
  if (!item) {
    pane.innerHTML = '<p class="hint">Wybierz klucz z listy po lewej.</p>';
    return;
  }
  pane.innerHTML = `
    <div class="key-name">${item.key}</div>
    <div class="text-prompt">${escapeHtml(item.text)}</div>
    <div class="source-hint">grupa: ${item.group}${item.status === 'recorded' ? ' • ✅ już nagrane' : ''}</div>
    <div class="vu-meter"><div class="vu-bar" id="vu-bar"></div></div>
    <div class="controls" id="rec-controls">
      <button id="btn-rec">🎤 Start (Spacja)</button>
    </div>
    <div id="preview-area"></div>
  `;
  document.getElementById('btn-rec').addEventListener('click', toggleRecording);
}

// filtry
document.querySelectorAll('#filters button[data-group]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#filters button[data-group]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.filterGroup = btn.dataset.group;
    renderKeyList();
  });
});
document.getElementById('filter-unrecorded').addEventListener('change', (e) => {
  state.filterUnrecorded = e.target.checked;
  renderKeyList();
});

async function pickFolder() {
  try {
    state.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err.name === 'AbortError') return; // user zamknął picker
    alert(`Błąd wyboru folderu: ${err.message}`);
    return;
  }
  document.querySelector('#folder-status em').textContent = state.dirHandle.name;
  await scanFolder();
  renderKeyList();
}

async function scanFolder() {
  if (!state.dirHandle) return;
  const existing = new Set();
  for await (const entry of state.dirHandle.values()) {
    if (entry.kind !== 'file') continue;
    const name = entry.name;
    // <klucz>.webm lub <klucz>.mp3
    const m = name.match(/^(.+)\.(webm|mp3|wav)$/i);
    if (m) existing.add(m[1]);
  }
  for (const k of state.keys) {
    k.status = existing.has(k.key) ? 'recorded' : 'unrecorded';
  }
}

document.getElementById('pick-folder').addEventListener('click', pickFolder);

async function ensureMicAccess() {
  if (state.mediaStream) return state.mediaStream;
  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return state.mediaStream;
  } catch (err) {
    alert(`Brak dostępu do mikrofonu: ${err.message}`);
    return null;
  }
}

async function toggleRecording() {
  if (!state.activeKey) return;
  if (state.isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  const stream = await ensureMicAccess();
  if (!stream) return;
  clearBlobUrl();
  const recordingKey = state.activeKey;
  state.recordingKey = recordingKey;
  state.recordedChunks = [];
  state.currentBlob = null;
  state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  state.mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
  };
  state.mediaRecorder.onstop = () => {
    state.currentBlob = new Blob(state.recordedChunks, { type: 'audio/webm' });
    state.recordingKey = null;
    setKeyStatus(recordingKey, 'preview');
    showPreview();
  };
  state.mediaRecorder.start();
  state.isRecording = true;
  setKeyStatus(recordingKey, 'recording');
  document.getElementById('btn-rec').textContent = '⏹ Stop (Spacja)';
}

function stopRecording() {
  if (!state.mediaRecorder) return;
  state.mediaRecorder.stop();
  state.isRecording = false;
  setKeyStatus(state.recordingKey, 'preview');
  document.getElementById('btn-rec').textContent = '🎤 Start (Spacja)';
}

function setKeyStatus(key, status) {
  const item = state.keys.find((k) => k.key === key);
  if (item) item.status = status;
  renderKeyList();
}

function showPreview() {
  const area = document.getElementById('preview-area');
  if (!state.currentBlob) {
    area.innerHTML = '';
    return;
  }
  clearBlobUrl();
  const url = URL.createObjectURL(state.currentBlob);
  state.currentBlobUrl = url;
  area.innerHTML = `
    <audio class="preview" controls src="${url}"></audio>
    <div class="controls" style="margin-top: 12px;">
      <button id="btn-save">✅ Zapisz (Enter)</button>
      <button id="btn-retry">🔄 Nagraj jeszcze raz (R)</button>
    </div>
  `;
  document.getElementById('btn-save').addEventListener('click', saveCurrent);
  document.getElementById('btn-retry').addEventListener('click', () => {
    clearBlobUrl();
    state.currentBlob = null;
    setKeyStatus(state.activeKey, 'unrecorded');
    renderActivePane();
  });
}

async function saveCurrent() {
  // implementacja w Task 5
  alert('Zapis zaimplementowany w następnym kroku.');
}

// init
(async () => {
  try {
    state.keys = await loadSources();
    renderKeyList();
  } catch (err) {
    document.getElementById('key-list').innerHTML = `<p class="hint">Błąd ładowania: ${err.message}</p>`;
  }
})();
