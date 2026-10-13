const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORE_KEY = 'framewise-library-v1';
let currentNotes = null;
let library = readLibrary();
let toastTimer;

function readLibrary() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
function persist() {
  library = library.slice(0, 15);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(library)); }
  catch { showToast('Browser storage is full. Export a few notes, then remove old saved entries.'); }
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function setBusy(show, title = '', detail = '') {
  $('#busy').classList.toggle('show', show);
  if (title) $('#busyTitle').textContent = title;
  if (detail) $('#busyText').textContent = detail;
}
function passwordHeaders() {
  const password = sessionStorage.getItem('framewise-password') || '';
  return password ? { 'x-app-password': password } : {};
}
async function api(path, options = {}) {
  const headers = { ...passwordHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('framewise-password');
      $('#passwordShade').classList.remove('hidden');
      $('#passwordError').textContent = 'Please enter the app password again.';
    }
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}
function updateLibraryCount() { $('#libraryCount').textContent = String(library.filter((item) => item.saved).length); }
function cardMarkup(item, index) {
  const title = escapeHtml(item.title || item.topic || 'Video notes');
  const date = new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const mark = escapeHtml((item.topic || item.title || 'F').trim().slice(0, 1).toUpperCase());
  return `<article class="video-card" data-index="${index}" tabindex="0" role="button"><div class="card-art">${mark}</div><div class="video-copy"><b>${title}</b><small><span>${date}</span><em>${item.saved ? 'Saved' : 'Notes'}</em></small></div></article>`;
}
function renderGrids() {
  const recent = library.slice(0, 3);
  $('#recentGrid').innerHTML = recent.map((item) => cardMarkup(item, library.indexOf(item))).join('');
  $('#recentGrid').classList.toggle('hidden', recent.length === 0);
  $('#emptyRecent').classList.toggle('hidden', recent.length !== 0);
  const query = ($('#searchInput')?.value || '').toLowerCase().trim();
  const saved = library.map((item, index) => ({ item, index })).filter(({ item }) => item.saved && `${item.title} ${item.topic} ${item.summary}`.toLowerCase().includes(query));
  $('#libraryGrid').innerHTML = saved.map(({ item, index }) => cardMarkup(item, index)).join('');
  $('#emptyLibrary').classList.toggle('hidden', saved.length !== 0);
  updateLibraryCount();
}
function openSaved(index) {
  const item = library[index]; if (!item) return;
  currentNotes = item; renderNotes(item); showView('notes');
}
function bindCards(container) {
  $(container).addEventListener('click', (event) => {
    const card = event.target.closest('.video-card'); if (card) openSaved(Number(card.dataset.index));
  });
  $(container).addEventListener('keydown', (event) => {
    const card = event.target.closest('.video-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openSaved(Number(card.dataset.index)); }
  });
}
function showView(view) {
  $('#homeView').classList.toggle('hidden', view !== 'home');
  $('#libraryView').classList.toggle('hidden', view !== 'library');
  $('#notesView').classList.toggle('hidden', view !== 'notes');
  $('#crumb').textContent = view === 'library' ? 'My library' : view === 'notes' ? 'Video notes' : 'Overview';
  $$('.nav').forEach((button) => button.classList.toggle('active', button.dataset.view === (view === 'notes' ? 'home' : view)));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderNotes(notes) {
  currentNotes = notes;
  $('#notesTitle').textContent = notes.title || notes.topic || 'Video notes';
  const source = $('#sourceLink');
  if (notes.sourceUrl) { source.href = notes.sourceUrl; source.textContent = 'Open source video ↗'; source.classList.remove('hidden'); }
  else { source.removeAttribute('href'); source.textContent = 'Pasted transcript'; }
  $('#summaryText').textContent = notes.summary || '';
  $('#topicPills').innerHTML = (notes.topics || []).map((topic) => `<span>${escapeHtml(topic)}</span>`).join('');
  $('#takeawaysList').innerHTML = (notes.takeaways || []).map((point) => `<li>${escapeHtml(point)}</li>`).join('');
  $('#learningsList').innerHTML = (notes.learnings || []).map((point) => `<li>${escapeHtml(point)}</li>`).join('');
  $('#transcriptText').textContent = notes.transcript || '';
  const branches = notes.mindMap?.branches || [];
  const branchMarkup = (branch) => `<div class="map-branch">${escapeHtml(branch.label)}${branch.children?.length ? `<small>${branch.children.map(escapeHtml).join(' · ')}</small>` : ''}</div>`;
  const splitAt = Math.ceil(branches.length / 2);
  $('#mapCanvas').innerHTML = `<div class="map-branches">${branches.slice(0, splitAt).map(branchMarkup).join('')}</div><div class="map-center">${escapeHtml(notes.mindMap?.center || notes.topic || 'Key idea')}</div><div class="map-branches">${branches.slice(splitAt).map(branchMarkup).join('')}</div>`;
  $('#infographic').innerHTML = `<div class="info-head"><small>FRAMEWISE · VIDEO NOTES</small><h2>${escapeHtml(notes.title || notes.topic || 'Key ideas')}</h2><p>${escapeHtml(notes.summary || '')}</p></div><div class="info-body">${(notes.takeaways || []).slice(0, 6).map((point, i) => `<div class="info-point"><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(point)}</div>`).join('')}</div><div class="info-footer">Key ideas from your video · Made with Framewise</div>`;
  $('#saveButton').textContent = notes.saved ? '♥ Saved' : '♡ Save';
  $$('.tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === 'summary'));
  $$('.notes-panel').forEach((panel) => panel.classList.toggle('active', panel.id === 'panel-summary'));
}
function remember(notes) {
  const key = notes.sourceUrl || `transcript:${notes.createdAt}`;
  const existing = library.findIndex((item) => (item.sourceUrl || `transcript:${item.createdAt}`) === key);
  const saved = existing >= 0 ? Boolean(library[existing].saved) : false;
  const item = { ...notes, saved, createdAt: notes.createdAt || new Date().toISOString() };
  if (existing >= 0) library.splice(existing, 1);
  library.unshift(item); library = library.slice(0, 50); persist(); renderGrids();
  currentNotes = item; renderNotes(item);
}
async function summarizeTranscript(transcript, sourceUrl = '') {
  return api('/api/summarize', { method: 'POST', body: JSON.stringify({ transcript, sourceUrl }) });
}
async function analyzeUrl(url) {
  if (!url) throw new Error('Paste a YouTube video link to get started.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('That link does not look like a valid URL.'); }
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(parsed.hostname.toLowerCase())) throw new Error('Please enter a youtube.com or youtu.be link.');
  setBusy(true, 'Finding the transcript', 'Looking for captions or an available transcript…');
  let result = await api('/api/transcript', { method: 'POST', body: JSON.stringify({ url }) });
  if (result.jobId) {
    const jobId = result.jobId;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1600));
      result = await api(`/api/transcript-status?jobId=${encodeURIComponent(jobId)}`);
      if (result.transcript || result.status === 'completed') break;
      setBusy(true, 'Preparing the transcript', 'Longer videos can take a little more time…');
    }
  }
  if (!result.transcript) throw new Error('The transcript is still processing. Please try again in a moment.');
  setBusy(true, 'Making your notes', 'Summarizing key ideas and building your visual map…');
  const notes = await summarizeTranscript(result.transcript, url);
  notes.sourceUrl = url;
  return notes;
}
async function runUrl() {
  const url = $('#videoUrl').value.trim();
  try {
    setBusy(true, 'Getting started', '');
    const notes = await analyzeUrl(url); notes.createdAt = new Date().toISOString(); remember(notes); showView('notes');
  } catch (error) { setBusy(false); showToast(error.message); }
  finally { setBusy(false); }
}
async function runTranscript() {
  const transcript = $('#transcriptInput').value.trim();
  if (transcript.length < 80) { showToast('Add a few sentences of transcript first.'); $('#transcriptInput').focus(); return; }
  try {
    setBusy(true, 'Making your notes', 'Summarizing key ideas and building your visual map…');
    const notes = await summarizeTranscript(transcript); notes.createdAt = new Date().toISOString(); remember(notes); showView('notes');
  } catch (error) { showToast(error.message); }
  finally { setBusy(false); }
}
function sample() {
  const notes = {
    title: 'The quiet power of doing one thing at a time', topic: 'Deep focus',
    summary: 'Deep focus is less about squeezing more into the day and more about giving one meaningful task your full attention. By reducing distractions, working in focused intervals, and protecting time to think, we can make better work with less mental strain.',
    takeaways: ['Attention is a limited resource; spend it deliberately.','Short, distraction-free work sessions often beat long, interrupted hours.','Rest is part of focused work, not a reward for finishing it.'],
    learnings: ['Choose one clear outcome before beginning a work session.','Put your phone and unrelated tabs out of reach during focused work.','After a focused interval, take a real break before starting again.'],
    topics: ['Focus','Attention','Better work'],
    mindMap: { center: 'Deep focus', branches: [{label:'Protect attention',children:['Choose one task','Reduce distractions']},{label:'Work with intention',children:['Set a clear goal','Use focused intervals']},{label:'Recover well',children:['Take real breaks','Make time to think']}] },
    transcript: 'We often think productivity means doing more things. But the real shift comes from choosing what deserves our attention. When we give one task a clear space, we make room for better thinking. Protecting time for focus can improve both the quality of our work and how we feel while doing it. Short periods of focused effort, followed by genuine rest, are often more sustainable than a long day of constant interruptions.',
    sourceUrl: '', createdAt: new Date().toISOString(), saved: false,
  };
  remember(notes); showView('notes');
}
function textForNotes(notes) {
  return `${notes.title}\n${notes.sourceUrl || 'Pasted transcript'}\n\nSUMMARY\n${notes.summary}\n\nKEY TAKEAWAYS\n${(notes.takeaways || []).map((item) => `• ${item}`).join('\n')}\n\nLEARNINGS\n${(notes.learnings || []).map((item) => `• ${item}`).join('\n')}\n\nTRANSCRIPT\n${notes.transcript}`;
}
function download(filename, contents, type) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([contents], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}
function xmlEscape(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[c]); }
function posterSvg(notes) {
  const points = (notes.takeaways || []).slice(0, 5);
  const rows = points.map((point, i) => `<rect x="52" y="${320 + i*94}" width="696" height="72" rx="16" fill="#ffffff"/><circle cx="90" cy="${356 + i*94}" r="18" fill="#e8f2eb"/><text x="90" y="${362 + i*94}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#426d5b">${i+1}</text><text x="124" y="${352 + i*94}" font-family="Arial" font-size="18" fill="#39483e">${xmlEscape(point.slice(0, 68))}${point.length > 68 ? '…' : ''}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${400 + points.length*94}" viewBox="0 0 800 ${400 + points.length*94}"><rect width="800" height="100%" fill="#f4f7f2"/><rect width="800" height="270" fill="#365f4d"/><text x="52" y="58" font-family="Arial" font-size="13" letter-spacing="2" fill="#c5d9cb">FRAMEWISE · VIDEO NOTES</text><text x="52" y="122" font-family="Arial" font-size="34" font-weight="700" fill="#ffffff">${xmlEscape((notes.title || notes.topic || 'Key ideas').slice(0, 38))}</text><foreignObject x="52" y="150" width="690" height="95"><div xmlns="http://www.w3.org/1999/xhtml" style="font:15px/1.55 Arial;color:#d5e2d8">${xmlEscape((notes.summary || '').slice(0, 260))}</div></foreignObject>${rows}<text x="52" y="${390 + points.length*94}" font-family="Arial" font-size="12" fill="#78877c">Key ideas from your video · Made with Framewise</text></svg>`;
}
async function init() {
  bindCards('#recentGrid'); bindCards('#libraryGrid'); renderGrids();
  try {
    const health = await fetch('/api/health').then((r) => r.json());
    if (health.passwordRequired && !sessionStorage.getItem('framewise-password')) $('#passwordShade').classList.remove('hidden');
    if (!health.ready) showToast('Add your API keys in hosting settings to enable live analysis.');
  } catch { /* The page can still be read when viewed outside its hosted app. */ }
}

$('#urlAnalyze').addEventListener('click', runUrl);
$('#videoUrl').addEventListener('keydown', (event) => { if (event.key === 'Enter') runUrl(); });
$('#textAnalyze').addEventListener('click', runTranscript);
$('#pasteToggle').addEventListener('click', () => { $('#pasteArea').classList.toggle('open'); if ($('#pasteArea').classList.contains('open')) $('#transcriptInput').focus(); });
$('#sampleButton').addEventListener('click', sample);
$('#newButton').addEventListener('click', () => { showView('home'); $('#videoUrl').focus(); });
$('#seeLibrary').addEventListener('click', () => showView('library'));
$('#startFirst').addEventListener('click', () => { showView('home'); $('#videoUrl').focus(); });
$$('.nav').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
$('#searchInput').addEventListener('input', renderGrids);
$('#backButton').addEventListener('click', () => showView('home'));
$$('.tab').forEach((button) => button.addEventListener('click', () => {
  $$('.tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  $$('.notes-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${button.dataset.tab}`));
}));
$('#saveButton').addEventListener('click', () => {
  if (!currentNotes) return;
  const key = currentNotes.sourceUrl || `transcript:${currentNotes.createdAt}`;
  const index = library.findIndex((item) => (item.sourceUrl || `transcript:${item.createdAt}`) === key);
  if (index < 0) { const copy = { ...currentNotes, saved: true }; library.unshift(copy); currentNotes = copy; }
  else { library[index].saved = !library[index].saved; currentNotes = library[index]; }
  persist(); renderGrids(); renderNotes(currentNotes); showToast(currentNotes.saved ? 'Saved to your library.' : 'Removed from your library.');
});
$('#copyButton').addEventListener('click', async () => {
  if (!currentNotes) return;
  try { await navigator.clipboard.writeText(textForNotes(currentNotes)); showToast('Notes copied to clipboard.'); }
  catch { showToast('Clipboard access is unavailable in this browser.'); }
});
$('#copyTranscript').addEventListener('click', async () => {
  if (!currentNotes) return;
  try { await navigator.clipboard.writeText(currentNotes.transcript || ''); showToast('Transcript copied.'); }
  catch { showToast('Clipboard access is unavailable in this browser.'); }
});
$('#exportButton').addEventListener('click', () => {
  if (!currentNotes) return;
  const tab = $('.tab.active')?.dataset.tab;
  const base = (currentNotes.title || 'framewise-notes').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  if (tab === 'mindmap' || tab === 'infographic') download(`${base || 'framewise'}-infographic.svg`, posterSvg(currentNotes), 'image/svg+xml');
  else download(`${base || 'framewise'}-notes.txt`, textForNotes(currentNotes), 'text/plain;charset=utf-8');
  showToast(tab === 'mindmap' || tab === 'infographic' ? 'Infographic SVG downloaded.' : 'Notes downloaded as text.');
});
$('#helpButton').addEventListener('click', () => $('#helpShade').classList.remove('hidden'));
$('#closeHelp').addEventListener('click', () => $('#helpShade').classList.add('hidden'));
$('#helpShade').addEventListener('click', (event) => { if (event.target === $('#helpShade')) $('#helpShade').classList.add('hidden'); });
$('#passwordForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const password = $('#passwordInput').value;
  $('#passwordError').textContent = '';
  try {
    const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-app-password': password }, body: '{}' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Incorrect password.');
    sessionStorage.setItem('framewise-password', password); $('#passwordShade').classList.add('hidden'); $('#passwordInput').value = '';
  } catch (error) { $('#passwordError').textContent = error.message; }
});

init();
