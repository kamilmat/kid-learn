# Audio Recorder Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować standalone'owe narzędzie deweloperskie `tools/recorder/` (vanilla HTML+JS+CSS) pozwalające user'owi nagrać wszystkie ~145 kluczy audio jednym głosem, z auto-zapisem do `audio-source/manual-overrides/` przez File System Access API.

**Architecture:** Vanilla HTML+JS+CSS (zero build, zero zależności npm w samym narzędziu) serwowany przez prosty HTTP server (`python3 -m http.server`). Recorder czyta `audio-source/*.json` przez `fetch()`, używa `MediaRecorder API` (WebM/Opus output) do nagrywania i `FileSystemDirectoryHandle` do zapisu. Konwersja WebM→MP3 jest osobnym, ręcznym krokiem przez `pnpm audio:convert-overrides` (TS skrypt wołający `ffmpeg`). Istniejący `scripts/generate-audio.ts` pozostaje bez zmian.

**Tech Stack:**
- HTML5 + vanilla JS (ES modules) + plain CSS — w `tools/recorder/`
- `MediaRecorder API` (WebM/Opus)
- `Web Audio API` (`AnalyserNode` dla VU meter)
- `File System Access API` (`showDirectoryPicker`, `getFileHandle`, `createWritable`)
- TS + Node + `ffmpeg` (CLI) — dla skryptu konwersji
- Vitest — tylko dla skryptu konwersji (logika decyzji)

**Spec:** [`docs/superpowers/specs/2026-04-27-audio-recorder-tool-design.md`](../specs/2026-04-27-audio-recorder-tool-design.md)

---

## File Structure

**Tworzymy:**
- `tools/recorder/index.html` — struktura UI (lewa strona: lista grup; prawa: aktywny klucz + sterowanie)
- `tools/recorder/recorder.js` — cała logika recordera (single ES module, vanilla)
- `tools/recorder/recorder.css` — proste, czytelne style
- `tools/recorder/README.md` — instrukcja uruchomienia
- `scripts/convert-overrides.ts` — batch WebM→MP3 przez ffmpeg
- `scripts/convert-overrides.test.ts` — test logiki decyzji "czy konwertować"

**Modyfikujemy:**
- `package.json` — dorzucamy 2 skrypty: `dev:recorder`, `audio:convert-overrides`
- `.gitignore` — dorzucamy `audio-source/manual-overrides/*.webm`

**NIE dotykamy:**
- `scripts/generate-audio.ts` — bez zmian (już obsługuje override jako MP3)
- Nic w `src/` (recorder jest poza apką)
- Nic w `public/audio/` (to artefakt buildu, nie ruszamy)

---

## Task 1: Skeleton HTML + CSS + ładowanie list kluczy

**Cel:** Otwarcie `http://localhost:8080` w Chrome pokazuje listę wszystkich kluczy z `audio-source/*.json`, pogrupowaną. Bez nagrywania, bez zapisu — tylko widok.

**Files:**
- Create: `tools/recorder/index.html`
- Create: `tools/recorder/recorder.css`
- Create: `tools/recorder/recorder.js`

- [ ] **Step 1: Stwórz `tools/recorder/index.html`**

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <title>Iskierki — Audio Recorder</title>
  <link rel="stylesheet" href="./recorder.css" />
</head>
<body>
  <header>
    <h1>Iskierki — Audio Recorder</h1>
    <div id="folder-status">Folder: <em>nie wybrany</em> <button id="pick-folder">Wybierz folder</button></div>
    <div id="progress">Postęp: <span id="progress-count">0 / 0</span></div>
  </header>
  <nav id="filters">
    <button data-group="all" class="active">Wszystkie</button>
    <button data-group="Litery">Litery</button>
    <button data-group="Słowa">Słowa</button>
    <button data-group="Asocjacje">Asocjacje</button>
    <button data-group="UI">UI</button>
    <label><input type="checkbox" id="filter-unrecorded" /> tylko nieskończone</label>
  </nav>
  <main>
    <aside id="key-list">Ładowanie…</aside>
    <section id="active-pane">
      <p class="hint">Wybierz klucz z listy po lewej.</p>
    </section>
  </main>
  <script type="module" src="./recorder.js"></script>
</body>
</html>
```

- [ ] **Step 2: Stwórz `tools/recorder/recorder.css`**

```css
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0; padding: 0;
  background: #fef9f2; color: #2d2d33;
  display: grid; grid-template-rows: auto auto 1fr; height: 100vh;
}
header { padding: 12px 20px; border-bottom: 1px solid #ddd; display: flex; gap: 24px; align-items: center; }
header h1 { margin: 0; font-size: 20px; }
nav { padding: 8px 20px; border-bottom: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
nav button { padding: 4px 12px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 4px; }
nav button.active { background: #2d2d33; color: white; }
nav label { margin-left: auto; }
main { display: grid; grid-template-columns: 360px 1fr; overflow: hidden; }
#key-list { overflow-y: auto; padding: 12px; border-right: 1px solid #eee; }
#key-list .group { margin-bottom: 16px; }
#key-list .group h3 { margin: 0 0 4px; font-size: 13px; color: #666; text-transform: uppercase; }
#key-list .key-row { padding: 6px 8px; cursor: pointer; border-radius: 4px; display: flex; gap: 8px; align-items: center; font-size: 14px; }
#key-list .key-row:hover { background: #f4eedb; }
#key-list .key-row.active { background: #2d2d33; color: white; }
#key-list .key-row .status { width: 18px; }
#key-list .key-row .key { font-family: monospace; min-width: 140px; }
#key-list .key-row .text { color: #888; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#key-list .key-row.active .text { color: #ddd; }
#active-pane { padding: 32px; display: flex; flex-direction: column; gap: 20px; align-items: center; justify-content: center; }
#active-pane .key-name { font-family: monospace; font-size: 18px; color: #666; }
#active-pane .text-prompt { font-size: 64px; font-weight: bold; text-align: center; }
#active-pane .source-hint { color: #888; font-size: 13px; }
#active-pane .vu-meter { width: 320px; height: 24px; background: #eee; border-radius: 12px; overflow: hidden; }
#active-pane .vu-meter .vu-bar { height: 100%; background: linear-gradient(90deg, #4ade80 0%, #facc15 70%, #ef4444 100%); width: 0%; transition: width 60ms linear; }
#active-pane .controls { display: flex; gap: 12px; }
#active-pane .controls button { padding: 12px 24px; font-size: 16px; border: none; background: #2d2d33; color: white; border-radius: 8px; cursor: pointer; }
#active-pane .controls button:disabled { opacity: 0.4; cursor: not-allowed; }
#active-pane .preview { width: 320px; }
.hint { color: #999; }
```

- [ ] **Step 3: Stwórz `tools/recorder/recorder.js` (loader + render listy)**

```js
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

// init
(async () => {
  try {
    state.keys = await loadSources();
    renderKeyList();
  } catch (err) {
    document.getElementById('key-list').innerHTML = `<p class="hint">Błąd ładowania: ${err.message}</p>`;
  }
})();
```

- [ ] **Step 4: Manualny test — uruchom recorder**

Uruchom:
```bash
cd /Users/kamilmat87/kid-learn/tools/recorder && python3 -m http.server 8080
```

Otwórz `http://localhost:8080` w Chrome.

**Oczekiwane:**
- Lista kluczy podzielona na grupy: Litery (32), Słowa (32), Asocjacje (31), UI (~50)
- Klik klucza → po prawej stronie pojawia się klucz + tekst (z JSON-a) + nazwa grupy
- Filtry "Wszystkie / Litery / Słowa / Asocjacje / UI" działają
- "tylko nieskończone" działa (na razie wszystko ⬜, więc nic nie filtruje)
- Brak błędów w DevTools console

Zatrzymaj serwer (Ctrl+C) po sprawdzeniu.

- [ ] **Step 5: Commit**

```bash
git add tools/recorder/index.html tools/recorder/recorder.css tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): skeleton HTML + lista kluczy z audio-source/*.json

Recorder w tools/recorder/ — vanilla HTML+JS+CSS, czyta JSON-y przez fetch,
renderuje pogrupowaną listę kluczy z filtrowaniem. Bez nagrywania jeszcze.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Folder picker + skan istniejących plików

**Cel:** Klik "Wybierz folder" otwiera File System Access API picker. Po wyborze folderu recorder skanuje go i oznacza klucze, dla których plik już istnieje (`<klucz>.webm` lub `<klucz>.mp3`) jako ✅.

**Files:**
- Modify: `tools/recorder/recorder.js`

- [ ] **Step 1: Dorzuć handler folder pickera**

Dorzuć w `tools/recorder/recorder.js` (na końcu, przed `// init`):

```js
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
```

- [ ] **Step 2: Manualny test — wybór folderu**

Uruchom recorder (jak w Task 1 Step 4) i Chrome:
1. Klik "Wybierz folder"
2. Wskaż `kid-learn/audio-source/manual-overrides/`
3. Zezwól na write

**Oczekiwane:**
- Nagłówek pokazuje "Folder: manual-overrides"
- Status `sfx-correct-ding` i `sfx-mastery-fanfara` zmienia się na ✅ (te pliki już są)
- Reszta kluczy zostaje ⬜
- Postęp pokazuje "2 / 145" (lub podobnie zależnie od dokładnej liczby kluczy)

- [ ] **Step 3: Commit**

```bash
git add tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): folder picker + skan istniejących plików

File System Access API: pick folder once per session, scan dla
istniejących <klucz>.{webm,mp3,wav}, oznacz jako recorded.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mikrofon + nagrywanie + preview

**Cel:** Po wybraniu klucza pojawia się przycisk "🎤 Start". Klik (lub Spacja) → start nagrywania (MediaRecorder, WebM/Opus). Klik ponownie → stop, pojawia się `<audio>` z preview + przycisk "Zapisz" (na razie no-op) + "Nagraj jeszcze raz".

**Files:**
- Modify: `tools/recorder/recorder.js`

- [ ] **Step 1: Dorzuć stan dla recordera + UI sterowania**

Zmień `renderActivePane` w `tools/recorder/recorder.js`:

```js
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
```

Dorzuć stan recordera u góry pliku (do obiektu `state`):

```js
const state = {
  keys: [],
  activeKey: null,
  filterGroup: 'all',
  filterUnrecorded: false,
  dirHandle: null,
  // recording
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  currentBlob: null,
  isRecording: false,
};
```

- [ ] **Step 2: Dorzuć logikę start/stop nagrywania + preview**

Dorzuć na końcu `tools/recorder/recorder.js` (przed `// init`):

```js
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
  state.recordedChunks = [];
  state.currentBlob = null;
  state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  state.mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
  };
  state.mediaRecorder.onstop = () => {
    state.currentBlob = new Blob(state.recordedChunks, { type: 'audio/webm' });
    showPreview();
  };
  state.mediaRecorder.start();
  state.isRecording = true;
  setKeyStatus(state.activeKey, 'recording');
  document.getElementById('btn-rec').textContent = '⏹ Stop (Spacja)';
}

function stopRecording() {
  if (!state.mediaRecorder) return;
  state.mediaRecorder.stop();
  state.isRecording = false;
  setKeyStatus(state.activeKey, 'preview');
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
  const url = URL.createObjectURL(state.currentBlob);
  area.innerHTML = `
    <audio class="preview" controls src="${url}"></audio>
    <div class="controls" style="margin-top: 12px;">
      <button id="btn-save">✅ Zapisz (Enter)</button>
      <button id="btn-retry">🔄 Nagraj jeszcze raz (R)</button>
    </div>
  `;
  document.getElementById('btn-save').addEventListener('click', saveCurrent);
  document.getElementById('btn-retry').addEventListener('click', () => {
    state.currentBlob = null;
    setKeyStatus(state.activeKey, 'unrecorded');
    renderActivePane();
  });
}

async function saveCurrent() {
  // implementacja w Task 5
  alert('Zapis zaimplementowany w następnym kroku.');
}
```

- [ ] **Step 3: Manualny test — nagrywanie i preview**

Uruchom recorder. W Chrome:
1. Klik "Wybierz folder" → wskaż `audio-source/manual-overrides/`
2. Klik klucz `letter-a` z listy
3. Klik "🎤 Start" → Chrome pyta o mikrofon, zezwól
4. Powiedz coś
5. Klik "⏹ Stop"

**Oczekiwane:**
- Pojawia się `<audio>` z preview, możesz odsłuchać
- Pojawiają się przyciski "Zapisz" i "Nagraj jeszcze raz"
- Status klucza w liście: ⏺ podczas nagrywania, ▶ po stop
- Klik "Nagraj jeszcze raz" → preview znika, status wraca do ⬜
- Klik "Zapisz" → na razie alert "zaimplementowany w następnym kroku" (OK)

- [ ] **Step 4: Commit**

```bash
git add tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): nagrywanie przez MediaRecorder + preview

Klik klucza → 🎤 Start → MediaRecorder (WebM/Opus) → ⏹ Stop → audio preview.
Save jeszcze noop, retry działa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: VU meter

**Cel:** Podczas nagrywania pasek VU pokazuje na żywo poziom głosu (Web Audio API + AnalyserNode).

**Files:**
- Modify: `tools/recorder/recorder.js`

- [ ] **Step 1: Dorzuć VU meter do startu/stopu**

W `tools/recorder/recorder.js`, w funkcji `startRecording`, **przed** `state.mediaRecorder.start();` dorzuć:

```js
  startVuMeter(stream);
```

W funkcji `stopRecording`, **przed** `state.mediaRecorder.stop();` dorzuć:

```js
  stopVuMeter();
```

Dorzuć w `state` u góry:

```js
  // vu meter
  vuContext: null,
  vuAnalyser: null,
  vuRafId: null,
```

Dorzuć funkcje `startVuMeter` / `stopVuMeter` (przed `// init`):

```js
function startVuMeter(stream) {
  state.vuContext = new AudioContext();
  const source = state.vuContext.createMediaStreamSource(stream);
  state.vuAnalyser = state.vuContext.createAnalyser();
  state.vuAnalyser.fftSize = 256;
  source.connect(state.vuAnalyser);
  const buf = new Uint8Array(state.vuAnalyser.frequencyBinCount);
  const bar = document.getElementById('vu-bar');
  function tick() {
    state.vuAnalyser.getByteFrequencyData(buf);
    let sum = 0;
    for (const v of buf) sum += v;
    const avg = sum / buf.length; // 0..255
    const pct = Math.min(100, (avg / 128) * 100); // 0..100, próg ~50% przy normalnej mowie
    if (bar) bar.style.width = pct + '%';
    state.vuRafId = requestAnimationFrame(tick);
  }
  tick();
}

function stopVuMeter() {
  if (state.vuRafId) cancelAnimationFrame(state.vuRafId);
  state.vuRafId = null;
  if (state.vuContext) {
    state.vuContext.close();
    state.vuContext = null;
  }
  state.vuAnalyser = null;
  const bar = document.getElementById('vu-bar');
  if (bar) bar.style.width = '0%';
}
```

- [ ] **Step 2: Manualny test VU**

Uruchom recorder. Wybierz klucz, kliknij Start, mów do mikrofonu.

**Oczekiwane:**
- Pasek VU rośnie i opada w rytmie głosu (zielony→żółty→czerwony zależnie od poziomu)
- Po Stop pasek wraca do 0
- Bez wycieków AudioContext (brak warningów w DevTools)

- [ ] **Step 3: Commit**

```bash
git add tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): VU meter podczas nagrywania (Web Audio API)

AnalyserNode + requestAnimationFrame, gradient zielony→żółty→czerwony.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Zapis do folderu (File System Access API)

**Cel:** Klik "Zapisz" zapisuje aktualny blob jako `<klucz>.webm` w wybranym folderze. Status zmienia się na ✅. Auto-skok na następny nieskończony klucz.

**Files:**
- Modify: `tools/recorder/recorder.js`

- [ ] **Step 1: Zaimplementuj `saveCurrent`**

W `tools/recorder/recorder.js` zastąp placeholder `saveCurrent`:

```js
async function saveCurrent() {
  if (!state.currentBlob || !state.activeKey) return;
  if (!state.dirHandle) {
    alert('Najpierw wybierz folder docelowy.');
    return;
  }
  const filename = `${state.activeKey}.webm`;
  try {
    const fileHandle = await state.dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(state.currentBlob);
    await writable.close();
  } catch (err) {
    alert(`Błąd zapisu: ${err.message}`);
    return;
  }
  setKeyStatus(state.activeKey, 'recorded');
  state.currentBlob = null;
  // auto-skok na następny nieskończony
  const nextKey = findNextUnrecorded(state.activeKey);
  if (nextKey) {
    selectKey(nextKey);
  } else {
    renderActivePane(); // odśwież obecny widok (pokaże "✅ już nagrane")
  }
}

function findNextUnrecorded(currentKey) {
  // Filtrujemy zgodnie z aktualnym filtrem grupy (ale nie "tylko nieskończone" — bo i tak szukamy nieskończonych)
  const filtered = state.keys.filter((k) => state.filterGroup === 'all' || k.group === state.filterGroup);
  const idx = filtered.findIndex((k) => k.key === currentKey);
  if (idx === -1) return null;
  for (let i = idx + 1; i < filtered.length; i++) {
    if (filtered[i].status === 'unrecorded') return filtered[i].key;
  }
  // Jeśli nie ma dalej, szukamy od początku (wrap)
  for (let i = 0; i < idx; i++) {
    if (filtered[i].status === 'unrecorded') return filtered[i].key;
  }
  return null;
}
```

- [ ] **Step 2: Manualny test zapisu**

Uruchom recorder. W Chrome:
1. Wybierz folder `audio-source/manual-overrides/`
2. Klik klucz `letter-a`
3. Start → mów "a" → Stop → preview
4. Klik "Zapisz"

**Oczekiwane:**
- Plik `letter-a.webm` istnieje w `audio-source/manual-overrides/` (sprawdź `ls -la`)
- Status `letter-a` zmienia się na ✅
- Recorder skacze na następny klucz (`letter-ą`)
- Postęp: "1 / 145" (lub +1 niż było)

Test edge: nagraj `letter-a` ponownie, kliknij Zapisz — plik zostaje **nadpisany** (ten sam rozmiar lub nowy timestamp).

Test edge: kliknij "Zapisz" bez wcześniejszego nagrania → nie powinno nic zrobić (currentBlob null).

- [ ] **Step 3: Commit**

```bash
git add tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): zapis blob → File System Access API jako <klucz>.webm

Auto-skok na następny nieskończony po zapisie. Nadpisywanie istniejących plików.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Skróty klawiaturowe

**Cel:** Spacja = toggle start/stop, Enter = zapisz, R = nagraj jeszcze raz, ←/→ = nawigacja po przefiltrowanej liście.

**Files:**
- Modify: `tools/recorder/recorder.js`

- [ ] **Step 1: Dorzuć global keyboard handler**

Dorzuć w `tools/recorder/recorder.js` (przed `// init`):

```js
function getFilteredKeys() {
  return state.keys.filter((k) => {
    if (state.filterGroup !== 'all' && k.group !== state.filterGroup) return false;
    if (state.filterUnrecorded && k.status !== 'unrecorded') return false;
    return true;
  });
}

function moveActive(delta) {
  const filtered = getFilteredKeys();
  if (filtered.length === 0) return;
  const idx = filtered.findIndex((k) => k.key === state.activeKey);
  let next;
  if (idx === -1) {
    next = filtered[0];
  } else {
    const ni = (idx + delta + filtered.length) % filtered.length;
    next = filtered[ni];
  }
  selectKey(next.key);
}

document.addEventListener('keydown', (e) => {
  // ignoruj jeśli focus jest w jakimś input/textarea (defensywnie — nie mamy ich, ale zawczasu)
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    toggleRecording();
  } else if (e.code === 'Enter') {
    e.preventDefault();
    if (state.currentBlob) saveCurrent();
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    if (state.currentBlob) {
      state.currentBlob = null;
      setKeyStatus(state.activeKey, 'unrecorded');
      renderActivePane();
    }
  } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
    e.preventDefault();
    moveActive(+1);
  } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
    e.preventDefault();
    moveActive(-1);
  }
});
```

- [ ] **Step 2: Manualny test klawiatury**

Uruchom recorder. Wybierz folder, wybierz dowolny klucz.

**Oczekiwane (każde testuj osobno):**
- Spacja (bez focusu na przycisku) → start nagrywania (jeśli nie nagrywam) lub stop (jeśli nagrywam)
- Enter (po preview) → zapis
- R (po preview) → reset do ⬜
- ↓ / → → następny klucz w liście
- ↑ / ← → poprzedni klucz w liście
- Strzałki działają zgodnie z aktualnym filtrem (np. po zaznaczeniu "Litery" strzałki krążą tylko po literach)

- [ ] **Step 3: Commit**

```bash
git add tools/recorder/recorder.js
git commit -m "$(cat <<'EOF'
feat(recorder): skróty klawiaturowe (Spacja/Enter/R/strzałki)

Spacja = start/stop, Enter = zapisz, R = nagraj jeszcze raz,
strzałki = nawigacja po przefiltrowanej liście.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Skrypt konwersji WebM → MP3

**Cel:** `pnpm audio:convert-overrides` konwertuje wszystkie nowe `.webm` w `audio-source/manual-overrides/` do `.mp3` (idempotentnie — pomija jeśli `.mp3` już jest i jest nowsze).

**Files:**
- Create: `scripts/convert-overrides.ts`
- Create: `scripts/convert-overrides.test.ts`

- [ ] **Step 1: TDD — napisz test logiki decyzji**

Stwórz `scripts/convert-overrides.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decideConvert } from './convert-overrides'

describe('decideConvert', () => {
  it('konwertuje gdy mp3 nie istnieje', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: false, mp3Mtime: 0 })).toEqual({ convert: true, reason: 'no-mp3' })
  })

  it('konwertuje gdy webm jest nowszy niż mp3', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 200, mp3Exists: true, mp3Mtime: 100 })).toEqual({ convert: true, reason: 'webm-newer' })
  })

  it('pomija gdy mp3 jest aktualne (nowsze lub równe webm)', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: true, mp3Mtime: 100 })).toEqual({ convert: false, reason: 'up-to-date' })
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: true, mp3Mtime: 200 })).toEqual({ convert: false, reason: 'up-to-date' })
  })

  it('zwraca błąd gdy webm nie istnieje', () => {
    expect(decideConvert({ webmExists: false, webmMtime: 0, mp3Exists: false, mp3Mtime: 0 })).toEqual({ convert: false, reason: 'no-webm' })
  })
})
```

- [ ] **Step 2: Uruchom test żeby zobaczyć że failuje**

```bash
pnpm test --run scripts/convert-overrides.test.ts
```

**Oczekiwane:** FAIL — `Cannot find module './convert-overrides'`

- [ ] **Step 3: Stwórz `scripts/convert-overrides.ts` z logiką**

```ts
/**
 * Konwersja WebM → MP3 dla nagrań z tools/recorder/.
 *
 * Iteruje po `audio-source/manual-overrides/*.webm`, dla każdego pliku:
 *   - jeśli odpowiadający `.mp3` nie istnieje LUB jest starszy niż webm → wywołaj ffmpeg
 *   - inaczej skip
 *
 * Wymóg: `ffmpeg` w PATH (`brew install ffmpeg`).
 *
 * Run: pnpm exec tsx scripts/convert-overrides.ts
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const OVERRIDES_DIR = join(ROOT, 'audio-source', 'manual-overrides')

export type ConvertDecision =
  | { convert: true; reason: 'no-mp3' | 'webm-newer' }
  | { convert: false; reason: 'up-to-date' | 'no-webm' }

export function decideConvert(params: {
  webmExists: boolean
  webmMtime: number
  mp3Exists: boolean
  mp3Mtime: number
}): ConvertDecision {
  if (!params.webmExists) return { convert: false, reason: 'no-webm' }
  if (!params.mp3Exists) return { convert: true, reason: 'no-mp3' }
  if (params.webmMtime > params.mp3Mtime) return { convert: true, reason: 'webm-newer' }
  return { convert: false, reason: 'up-to-date' }
}

function ensureFfmpeg(): void {
  const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' })
  if (which.status !== 0 || !which.stdout.trim()) {
    console.error('ffmpeg nie znaleziony w PATH.')
    console.error('Zainstaluj: brew install ffmpeg')
    process.exit(1)
  }
}

function runFfmpeg(input: string, output: string): void {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', // overwrite
      '-i', input,
      '-codec:a', 'libmp3lame',
      '-qscale:a', '2', // VBR ~190kbps
      '-ar', '44100',
      '-ac', '1', // mono
      '-loglevel', 'error',
      output,
    ],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim()
    throw new Error(`ffmpeg failed: ${err}`)
  }
}

function main(): void {
  if (!existsSync(OVERRIDES_DIR)) {
    console.log(`Brak folderu ${OVERRIDES_DIR} — nic do konwersji.`)
    return
  }
  ensureFfmpeg()

  const files = readdirSync(OVERRIDES_DIR).filter((f) => f.endsWith('.webm'))
  if (files.length === 0) {
    console.log('Brak plików .webm do konwersji.')
    return
  }

  let converted = 0
  let skipped = 0
  let failed = 0

  for (const webmName of files) {
    const webmPath = join(OVERRIDES_DIR, webmName)
    const mp3Name = webmName.replace(/\.webm$/, '.mp3')
    const mp3Path = join(OVERRIDES_DIR, mp3Name)

    const webmStat = statSync(webmPath)
    const mp3Stat = existsSync(mp3Path) ? statSync(mp3Path) : null

    const decision = decideConvert({
      webmExists: true,
      webmMtime: webmStat.mtimeMs,
      mp3Exists: !!mp3Stat,
      mp3Mtime: mp3Stat?.mtimeMs ?? 0,
    })

    if (!decision.convert) {
      skipped += 1
      continue
    }

    try {
      console.log(`→ ${webmName} → ${mp3Name} (${decision.reason})`)
      runFfmpeg(webmPath, mp3Path)
      converted += 1
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${webmName}: ${msg}`)
    }
  }

  console.log('')
  console.log(`Done. converted=${converted} skipped=${skipped} failed=${failed} total=${files.length}`)
  if (failed > 0) process.exit(1)
}

const isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(__filename)
if (isEntry) main()
```

- [ ] **Step 4: Uruchom test ponownie**

```bash
pnpm test --run scripts/convert-overrides.test.ts
```

**Oczekiwane:** PASS — wszystkie 4 testy zielone.

- [ ] **Step 5: Manualny test pełnej konwersji**

Wymóg: masz przynajmniej jeden `.webm` w `audio-source/manual-overrides/` (nagrany w Task 5).

```bash
pnpm exec tsx scripts/convert-overrides.ts
```

**Oczekiwane:**
- Output: `→ letter-a.webm → letter-a.mp3 (no-mp3)` (lub podobnie)
- Plik `letter-a.mp3` istnieje w `audio-source/manual-overrides/`
- Druga uruchomienie: `Done. converted=0 skipped=N failed=0` (idempotentne)

Sprawdź też że audio MP3 jest słyszalne:

```bash
afplay audio-source/manual-overrides/letter-a.mp3
```

- [ ] **Step 6: Commit**

```bash
git add scripts/convert-overrides.ts scripts/convert-overrides.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): skrypt konwersji WebM → MP3 dla nagrań z recordera

scripts/convert-overrides.ts iteruje po audio-source/manual-overrides/*.webm,
woła ffmpeg z VBR Q=2, mono 44.1kHz. Idempotentny (mtime check).
Test: 4 zielone (decideConvert).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: package.json scripts + .gitignore

**Cel:** `pnpm dev:recorder` uruchamia HTTP server w `tools/recorder/`. `pnpm audio:convert-overrides` woła konwersję. WebM-y nie są commitowane.

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Dorzuć skrypty do `package.json`**

Otwórz `package.json` i dorzuć w sekcji `"scripts"` (po `"audio:check"`):

```json
    "audio:convert-overrides": "tsx scripts/convert-overrides.ts",
    "dev:recorder": "cd tools/recorder && python3 -m http.server 8080"
```

Pełna sekcja scripts powinna wyglądać tak:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "audio:build": "tsx scripts/generate-audio.ts build",
    "audio:check": "tsx scripts/generate-audio.ts check",
    "audio:convert-overrides": "tsx scripts/convert-overrides.ts",
    "dev:recorder": "cd tools/recorder && python3 -m http.server 8080"
  },
```

- [ ] **Step 2: Dorzuć WebM do `.gitignore`**

Dopisz na końcu `.gitignore`:

```
# Audio recorder source files (kept locally only; MP3 wersje commitowane)
audio-source/manual-overrides/*.webm
```

- [ ] **Step 3: Test obu skryptów**

```bash
pnpm audio:convert-overrides
```

**Oczekiwane:** ten sam output co w Task 7 Step 5 (idempotentne, skipped=N).

```bash
pnpm dev:recorder
```

**Oczekiwane:** HTTP server na porcie 8080. Otwórz `http://localhost:8080` w Chrome — recorder ładuje się poprawnie. Ctrl+C zamyka.

```bash
git status
```

**Oczekiwane:** `audio-source/manual-overrides/letter-a.webm` (i inne webm) NIE są wymienione (są ignorowane). `letter-a.mp3` (i inne mp3 z konwersji) SĄ wymienione (untracked).

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "$(cat <<'EOF'
feat(scripts): pnpm dev:recorder + audio:convert-overrides

dev:recorder odpala HTTP server na localhost:8080 dla tools/recorder/.
audio:convert-overrides woła scripts/convert-overrides.ts.
.gitignore: audio-source/manual-overrides/*.webm (źródłowe WebM lokalnie).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: README dla recordera

**Cel:** `tools/recorder/README.md` opisuje jak uruchomić, jakie są wymagania, jaki jest workflow end-to-end.

**Files:**
- Create: `tools/recorder/README.md`

- [ ] **Step 1: Stwórz `tools/recorder/README.md`**

```markdown
# Iskierki — Audio Recorder

Standalone'owe narzędzie deweloperskie do nagrywania plików audio projektu (literek, słów, asocjacji, ui-strings) jednolitym ludzkim głosem zamiast TTS Zofia.

## Wymagania

- **Chrome / Chromium-based browser** (Edge, Brave, Arc) — Safari nie obsługuje File System Access API
- Mikrofon
- `python3` (do prostego HTTP servera; alternatywnie `npx serve` / `php -S`)
- `ffmpeg` w PATH (`brew install ffmpeg`) — tylko do kroku konwersji do MP3

## Uruchomienie

Z roota repo:

```bash
pnpm dev:recorder
```

Otwórz `http://localhost:8080` w Chrome.

## Workflow

1. **Wybierz folder docelowy** — klik "Wybierz folder", wskaż `kid-learn/audio-source/manual-overrides/`. Chrome zapyta o pozwolenie na zapis. Klucze, dla których plik już istnieje, dostaną status ✅.

2. **Filtruj** (opcjonalnie) — wybierz grupę (Litery / Słowa / Asocjacje / UI) i/lub zaznacz "tylko nieskończone".

3. **Wybierz klucz** — klikiem w listę po lewej lub strzałkami ↑/↓ ←/→.

4. **Nagraj** — Spacja = start, mów (obserwuj VU meter), Spacja = stop. Pojawia się preview audio.

5. **Zapisz lub powtórz** — Enter = zapisz (plik leci do folderu jako `<klucz>.webm`, recorder skacze na następny nieskończony klucz), R = nagraj jeszcze raz.

## Skróty klawiaturowe

| Klawisz | Akcja |
|---|---|
| Spacja | Start / Stop nagrywania |
| Enter | Zapisz (po preview) |
| R | Nagraj jeszcze raz (po preview) |
| ↓ / → | Następny klucz |
| ↑ / ← | Poprzedni klucz |

## Po nagraniu — konwersja do MP3

WebM jest formatem nagrywania w przeglądarce. Aby pliki były używane przez apkę, trzeba skonwertować do MP3:

```bash
pnpm audio:convert-overrides   # tworzy .mp3 obok .webm (idempotentne)
pnpm audio:build               # kopiuje override mp3 → public/audio/, manifest update
pnpm dev                       # apka brzmi nowymi nagraniami
```

## Re-nagrywanie

Klucz, który chcesz przenagrać:
1. W recorderze: klik klucza → R (jeśli był w preview) lub po prostu nagraj ponownie i zapisz — plik się nadpisze
2. `pnpm audio:convert-overrides` — wykryje że WebM jest nowszy niż MP3 i przekonwertuje
3. `pnpm audio:build` — manifest zaktualizuje się

## Troubleshooting

**"Brak dostępu do mikrofonu"** — w Chrome: ustawienia → prywatność → mikrofon → dodaj `localhost` jako dozwolone.

**"Błąd zapisu"** — sprawdź czy wybrałeś folder z prawami zapisu, czy Chrome nie utracił handle (po dłuższej bezczynności może wymagać ponownego wyboru).

**Niska jakość nagrania** — sprawdź VU meter. Jeśli pasek jest słaby (zielony tylko), podejdź bliżej do mikrofonu lub zmień mikrofon w preferencjach systemowych.

**Cisza na początku/końcu nagrania** — otwórz `.webm` w Audacity, wytnij ciszę, wyeksportuj jako `.webm` z powrotem do `manual-overrides/`. Następnie `pnpm audio:convert-overrides`.
```

- [ ] **Step 2: Commit**

```bash
git add tools/recorder/README.md
git commit -m "$(cat <<'EOF'
docs(recorder): README z instrukcją użycia + skrótami + troubleshooting

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Aktualizacja memory + STATUS.md

**Cel:** Zaktualizuj `memory/project_audio_voice_consistency.md` (decyzja revisited) oraz `docs/STATUS.md` (co zrobione, co dalej — user nagrywa).

**Files:**
- Modify: `/Users/kamilmat87/.claude/projects/-Users-kamilmat87-kid-learn/memory/project_audio_voice_consistency.md`
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Zaktualizuj memory file**

Otwórz `/Users/kamilmat87/.claude/projects/-Users-kamilmat87-kid-learn/memory/project_audio_voice_consistency.md` i zastąp zawartość:

```markdown
---
name: Audio voice consistency
description: Decyzja o jednolitym ludzkim głosie dla całego audio-stacku Iskierki, zastępującym TTS Zofia
type: project
---

**Decyzja 2026-04-27 (revision):** Cały audio-stack projektu Iskierki będzie nagrywany jednolitym, ludzkim głosem przez user'a (męski) — wszystkie ~145 kluczy: litery, słowa, asocjacje, ui-strings.

**Why:** TTS Zofia (Edge TTS, kobiecy syntetyczny głos) strukturalnie nie potrafi wymówić czystych fonemów — niezbędnych do polskiej metody głoskowej, która jest podstawą nauki czytania w zerówce. Próba znalezienia gotowego zbioru polskich głosek na licencji do redystrybucji (Wikimedia, Wiktionary, Lingua Libre) nie powiodła się — Olaf był odrzucony wcześniej, inni autorzy nie mają kompletnych zbiorów.

**How to apply:**
- Recorder w `tools/recorder/` służy do iteracyjnego nagrywania kluczy. Pliki lądują jako `.webm` w `audio-source/manual-overrides/`, konwertowane do MP3 przez `pnpm audio:convert-overrides`.
- TTS Zofia pozostaje TYLKO jako fallback dla NOWYCH kluczy, dla których override jeszcze nie istnieje (typowo: nowy moduł, nowa pochwała, nowa korekta).
- Przy projektowaniu nowych kluczy audio domyślnie zakładamy, że user je nagra — TTS to tymczasowe rozwiązanie do testowania w trakcie developmentu.
```

- [ ] **Step 2: Zaktualizuj `docs/STATUS.md`**

Dorzuć na początku `docs/STATUS.md` (po nagłówku) sekcję:

```markdown
## 2026-04-27 — Audio Recorder zaimplementowany

**Co zrobione:**
- Standalone narzędzie `tools/recorder/` — vanilla HTML+JS+CSS, MediaRecorder + File System Access API, czyta `audio-source/*.json` i pozwala nagrać per-klucz
- Skrypt `scripts/convert-overrides.ts` (`pnpm audio:convert-overrides`) — batch WebM→MP3 przez ffmpeg, idempotentny
- Skrypty: `pnpm dev:recorder` (HTTP server) + `pnpm audio:convert-overrides`
- `.gitignore`: `audio-source/manual-overrides/*.webm`
- README z instrukcją użycia + skrótami klawiaturowymi
- Memory zaktualizowane: cały audio-stack będzie jednolicie nagrany przez user'a; TTS Zofia tylko fallback dla nowych kluczy

**Co dalej:**
- User nagrywa wszystkie ~145 kluczy używając recordera (iteracyjnie — najpierw litery, potem reszta)
- Po pierwszej fali nagrań: `pnpm audio:convert-overrides && pnpm audio:build && pnpm dev` → testowanie jakości w przeglądarce
- Ewentualne re-nagrania problemowych kluczy
- Po komplecie: commit MP3 do repo, push, GH Pages PWA gra nowymi nagraniami
```

- [ ] **Step 3: Commit**

```bash
git add docs/STATUS.md
git commit -m "$(cat <<'EOF'
docs(status): audio recorder zaimplementowany, user nagrywa nowe audio

Memory file (project_audio_voice_consistency) też zaktualizowany.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Verification (po wszystkich taskach)

- [ ] **Pełen smoke test workflow:**

1. `pnpm test --run scripts/convert-overrides.test.ts` → 4 zielone
2. `pnpm dev:recorder` → otwiera HTTP server, w Chrome ładuje się recorder, lista kluczy widoczna
3. Wybierz folder, nagraj `letter-a` (głoska [a]), zapisz
4. `pnpm audio:convert-overrides` → konwertuje letter-a.webm → letter-a.mp3
5. `pnpm audio:build` → kopiuje letter-a.mp3 do `public/audio/letter-a.mp3`, manifest aktualizowany jako `source: 'override'`
6. `pnpm dev` → otwórz w Chrome `localhost:5173`, wejdź w sesję modułu liter — `letter-a` brzmi twoim głosem
7. `pnpm tsc -b && pnpm test --run` → cały projekt czysty (0 błędów)

- [ ] **Sprawdź `git log --oneline | head -15`:**

Powinno być 9 commitów feat/docs ze stage'a recorder + 1 dla aktualizacji memory/status.

- [ ] **Acceptance criteria z speca (Definition of Done):**

Sprawdź że wszystkie 10 punktów z speca [`docs/superpowers/specs/2026-04-27-audio-recorder-tool-design.md`](../specs/2026-04-27-audio-recorder-tool-design.md) (sekcja "Definition of Done") są spełnione.
