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
};

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
    <div class="source-hint">grupa: ${item.group}</div>
  `;
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

// init
(async () => {
  try {
    state.keys = await loadSources();
    renderKeyList();
  } catch (err) {
    document.getElementById('key-list').innerHTML = `<p class="hint">Błąd ładowania: ${err.message}</p>`;
  }
})();
