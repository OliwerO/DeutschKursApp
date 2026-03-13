/* ── Constants ───────────────────────────────────────────── */
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

/**
 * WORKER_URL
 * Leave empty ('') for the teacher's version (she enters her own API key).
 * Set to your Cloudflare Worker URL for the shared version (no key needed).
 */
const WORKER_URL = 'https://deutschkurs-api.owczarekoliwer.workers.dev/';

/* ── API Key card: hide when worker mode is active ───────── */
const apiKeyCard = document.getElementById('api-card');
const apiKeyInput = document.getElementById('api-key');
const savedMsg = document.getElementById('api-saved-msg');

(function initMode() {
  if (WORKER_URL) {
    if (apiKeyCard) apiKeyCard.style.display = 'none';
  } else {
    const saved = sessionStorage.getItem('anthropic_api_key');
    if (saved) {
      apiKeyInput.value = saved;
      savedMsg.classList.add('visible');
    }
  }
})();

/* ── Back to top button ───────────────────────────────────── */
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top');
  if (window.scrollY > 400) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
});

/* ── Group preset quick-fill ──────────────────────────────── */
function setGroup(btn) {
  document.getElementById('target-group').value = btn.dataset.val;
  document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { showError('Bitte geben Sie einen API-Schlüssel ein.'); return; }
  sessionStorage.setItem('anthropic_api_key', key);
  savedMsg.classList.add('visible');
  hideError();
}

/* ── Material type config ─────────────────────────────────── */
const MATERIAL_LABELS = {
  lueckentext: 'Lückentext',
  dialog: 'Einfacher Dialog',
  schreibuebung: 'Schreibübung',
  wortschatz: 'Wortschatz-Liste',
};

function optionalSection(details, lernziel) {
  let s = '';
  if (details) s += `\nZusätzliche Anforderungen / Schwerpunkte:\n${details}\n`;
  if (lernziel) s += `\nLernziel der Lehrerin:\n${lernziel}\n`;
  if (s) s = '\n---\n' + s + '\nBitte berücksichtige diese Angaben bei der Erstellung des Materials.';
  return s;
}

const MATERIAL_PROMPTS = {
  lueckentext: (zielgruppe, thema, niveau, dauer, details = '', lernziel = '') => `
Erstelle einen **Lückentext** auf Deutsch.

Zielgruppe: ${zielgruppe}
Thema: ${thema}
Sprachniveau: ${niveau}
Unterrichtsdauer: ${dauer} – passe Länge und Anzahl der Lücken entsprechend an.

Anweisungen:
- Schreibe einen einfachen Text zum Thema, passend für ${niveau} und ${dauer}.
- Ersetze 6–14 Wörter im Text durch Lücken (______) – je nach Länge des Textes.
- Füge am Ende eine **Wörterbox** mit allen fehlenden Wörtern hinzu (in zufälliger Reihenfolge).
- Schreibe danach eine **Lösung** (Solution key) mit den richtigen Wörtern.

Format:
## Lückentext: [Thema]
**Niveau:** [Niveau]

---

[Text mit Lücken hier]

---

**Wörterbox:**
[Wörter durch Komma getrennt]

---

## Lösung
[Nummerierte Liste mit den fehlenden Wörtern in der richtigen Reihenfolge]
${optionalSection(details, lernziel)}`,

  dialog: (zielgruppe, thema, niveau, dauer, details = '', lernziel = '') => `
Erstelle einen **einfachen Dialog** auf Deutsch.

Zielgruppe: ${zielgruppe}
Thema: ${thema}
Sprachniveau: ${niveau}
Unterrichtsdauer: ${dauer} – passe Länge und Anzahl der Übungsteile entsprechend an.

Anweisungen:
- Schreibe einen alltäglichen Dialog (Länge passend zu ${dauer}), 2 Personen.
- Sprachlich passend zu ${niveau}: korrekte Satzlänge und Grammatik für dieses Niveau.
- Gib jedem Sprecher einen klaren Namen passend zur Zielgruppe.
- Füge bei A1/A2 **phonetische Hinweise** in eckigen Klammern hinzu.
- Füge nach dem Dialog ein **Vokabular** mit Erklärungen auf Deutsch hinzu.
- Füge 2–4 **Redemittel** (nützliche Phrasen zum Üben) hinzu.
- Bei längerer Dauer: füge Rollenspiel-Variationen oder Lückendialog als Übung hinzu.

Format:
## Dialog: [Thema]
**Niveau:** [Niveau]

---

[Dialog hier, Name in Fettschrift]

---

**Vokabular:**
- **[Wort]** – [einfache Erklärung]

---

**Nützliche Phrasen:**
- "[Phrase]"
${optionalSection(details, lernziel)}`,

  schreibuebung: (zielgruppe, thema, niveau, dauer, details = '', lernziel = '') => `
Erstelle eine **Schreibübung** auf Deutsch.

Zielgruppe: ${zielgruppe}
Thema: ${thema}
Sprachniveau: ${niveau}
Unterrichtsdauer: ${dauer} – passe die Anzahl der Aufgaben entsprechend an.

Anweisungen:
- Erstelle geführte Schreibaufgaben passend zu ${dauer}.
- Jede Aufgabe soll konkret und alltagsnah sein, passend zu ${niveau}.
- Gib zu jeder Aufgabe **2–3 Beispielsätze** als Hilfe.
- Füge Schreiblinien hinzu: "_______________________________________________".
- Am Ende: **Hilfreiche Wörter** und **Musterlösung für Lehrkräfte**.
- Schreibe die Anweisungen direkt an die Lernenden (Sie-Form).

Format:
## Schreibübung: [Thema]
**Niveau:** [Niveau]

---

### Aufgabe 1: [Titel]
[Anweisung]

**Beispiel:**
- [Beispielsatz 1]
- [Beispielsatz 2]

Ihr Text:
_______________________________________________
_______________________________________________
_______________________________________________

[weitere Aufgaben...]

---

**Hilfreiche Wörter:**
[Wortliste]

---

## Musterlösung (für Lehrkräfte)
[Musterlösung]
${optionalSection(details, lernziel)}`,

  wortschatz: (zielgruppe, thema, niveau, dauer, details = '', lernziel = '') => `
Erstelle eine **Wortschatz-Liste** auf Deutsch.

Zielgruppe: ${zielgruppe}
Thema: ${thema}
Sprachniveau: ${niveau}
Unterrichtsdauer: ${dauer} – passe die Anzahl der Wörter entsprechend an.

Anweisungen:
- Wähle 10–25 wichtige Wörter zum Thema (je nach Dauer).
- Für jedes Wort: Wort mit Artikel (bei Nomen), Beispielsatz auf ${niveau}-Niveau, leere Spalte für Übersetzung.
- Sortiere thematisch in Cluster.
- Kurze Einleitung für die Lernenden.
- Am Ende: Übungssätze mit Lücken.

Format:
## Wortschatz: [Thema]
**Niveau:** [Niveau]

---

[Einleitung für Lernende]

| Nr. | Wort | Beispielsatz | Meine Übersetzung |
|-----|------|-------------|-------------------|
| 1.  | [Wort] | [Satz] | _________________ |
...

---

### Übung: Schreiben Sie das richtige Wort!
1. _________________ [Kontext-Satz mit Lücke]
2. _________________
3. _________________
${optionalSection(details, lernziel)}`,
};

/* ── Selection order tracking ───────────────────────────── */
const materialTypeOrder = ['lueckentext']; // pre-checked item
document.querySelectorAll('input[name="material-type"]').forEach(cb => {
  cb.addEventListener('change', () => {
    if (cb.checked) {
      if (!materialTypeOrder.includes(cb.value)) materialTypeOrder.push(cb.value);
    } else {
      const idx = materialTypeOrder.indexOf(cb.value);
      if (idx > -1) materialTypeOrder.splice(idx, 1);
    }
  });
});

/* ── SSE Stream Parser ───────────────────────────────────── */

/**
 * Reads an SSE stream from a fetch Response and calls onText for each
 * content_block_delta text chunk. Returns the full accumulated text.
 * Calls onError if an error event is received mid-stream.
 */
async function readSSEStream(response, { onText, onError }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        let event;
        try { event = JSON.parse(data); } catch { continue; }

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const chunk = event.delta.text;
          fullText += chunk;
          onText(chunk, fullText);
        } else if (event.type === 'error') {
          const msg = event.error?.message || 'Stream error';
          onError(new Error(msg));
        }
      }
    }
  } catch (err) {
    onError(err);
  }

  return fullText;
}

/* ── Streaming request helper ────────────────────────────── */

/**
 * Makes a streaming API request and returns the full text.
 * onChunk(fullTextSoFar) is called as each token arrives.
 * Throws on HTTP errors or stream errors.
 */
async function streamRequest(fetchUrl, fetchHeaders, userPrompt, onChunk) {
  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: fetchHeaders,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${response.status}`;
    if (response.status === 401) throw new Error('Der API-Schlüssel ist ungültig. Bitte prüfen Sie ihn.');
    if (response.status === 429) throw new Error('Zu viele Anfragen. Bitte warten Sie einen Moment.');
    throw new Error(`Fehler vom Server: ${msg}`);
  }

  let streamError = null;
  const fullText = await readSSEStream(response, {
    onText: (_chunk, fullText) => onChunk(fullText),
    onError: (err) => { streamError = err; },
  });

  if (streamError && !fullText) throw streamError;
  // If we got partial content + error, return what we have (caller handles it)
  return { text: fullText, error: streamError };
}

/* ── Generate ─────────────────────────────────────────────── */
async function generateMaterial(e) {
  e.preventDefault();

  const zielgruppe = document.getElementById('target-group').value.trim() || 'Erwachsene mit geringen Deutschkenntnissen';
  const thema = document.getElementById('topic').value.trim();
  const niveau = document.querySelector('input[name="niveau"]:checked').value;
  // Use selection order instead of DOM order
  const checkedValues = new Set([...document.querySelectorAll('input[name="material-type"]:checked')].map(cb => cb.value));
  const selectedTypes = materialTypeOrder.filter(v => checkedValues.has(v));
  const dauer = document.querySelector('input[name="duration"]:checked').value;

  const details = document.getElementById('details').value.trim();
  const goalChips = [...document.querySelectorAll('#goal-chips input[type="checkbox"]:checked')]
    .map(cb => cb.value);
  const goalCustom = document.getElementById('goal-custom').value.trim();
  const lernzielParts = [...goalChips, ...(goalCustom ? [goalCustom] : [])];
  const lernziel = lernzielParts.join('; ');

  let fetchUrl, fetchHeaders;
  if (WORKER_URL) {
    fetchUrl = WORKER_URL;
    fetchHeaders = { 'Content-Type': 'application/json' };
  } else {
    const apiKey = (sessionStorage.getItem('anthropic_api_key') || apiKeyInput.value).trim();
    if (!apiKey) { showError('Bitte geben Sie zuerst Ihren API-Schlüssel ein.'); return; }
    fetchUrl = API_URL;
    fetchHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  if (!thema) { showError('Bitte geben Sie ein Thema ein.'); return; }
  if (!selectedTypes.length) { showError('Bitte wählen Sie mindestens einen Materialtyp aus.'); return; }

  hideError();
  setLoading(true);

  const output = document.getElementById('material-output');
  const card = document.getElementById('result-card');
  const loadingMsg = document.getElementById('loading-msg');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');

  // Show result card immediately for streaming display
  card.style.display = 'block';
  output.innerHTML = '';

  // Show initial progress
  progressContainer.classList.add('visible');
  loadingMsg.classList.add('visible');
  progressBar.style.width = '5%';

  const results = [];
  let hadStreamError = false;

  try {
    for (let i = 0; i < selectedTypes.length; i++) {
      const typeVal = selectedTypes[i];
      const typeLabel = MATERIAL_LABELS[typeVal];

      if (selectedTypes.length > 1) {
        loadingMsg.textContent = `Erstelle ${typeLabel} (${i + 1}/${selectedTypes.length}) …`;
      } else {
        loadingMsg.textContent = `Erstelle ${typeLabel} …`;
      }

      // Calculate progress range for this material type
      const progressStart = (i / selectedTypes.length) * 90 + 5;
      const progressEnd = ((i + 1) / selectedTypes.length) * 90 + 5;
      progressBar.style.width = progressStart + '%';

      const userPrompt = MATERIAL_PROMPTS[typeVal](zielgruppe, thema, niveau, dauer, details, lernziel);

      // Add separator before non-first sections
      if (i > 0) {
        const sep = document.createElement('hr');
        sep.className = 'section-break';
        output.appendChild(sep);
      }

      // Create a container for this streaming section
      const sectionEl = document.createElement('div');
      sectionEl.className = 'streaming-section';
      output.appendChild(sectionEl);

      // Scroll to the result card on first chunk
      let scrolledToResult = false;

      const { text, error } = await streamRequest(fetchUrl, fetchHeaders, userPrompt, (fullText) => {
        // Render incrementally
        const html = renderMarkdown(fullText);
        sectionEl.innerHTML = DOMPurify.sanitize(html, {
          ADD_TAGS: ['span'],
          ADD_ATTR: ['class'],
        });

        // Scroll to result on first visible content
        if (!scrolledToResult && fullText.length > 20) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          scrolledToResult = true;
        }

        // Update progress based on token flow (rough estimate)
        const estimatedProgress = Math.min(progressEnd, progressStart + (progressEnd - progressStart) * 0.9);
        progressBar.style.width = estimatedProgress + '%';
      });

      results.push({ typeVal, typeLabel, text });
      progressBar.style.width = progressEnd + '%';

      if (error) {
        hadStreamError = true;
        showError('Die Generierung wurde unterbrochen. Das bisher erstellte Material wird angezeigt.');
      }
    }

    // Final render: re-render all sections cleanly for post-processing (print-keep wrapping, etc.)
    finishDisplay(results, selectedTypes, thema, niveau, output, card);

    if (hadStreamError) {
      // Keep the error visible but don't throw
    }

  } catch (err) {
    // If we have partial results, show them
    if (results.length > 0) {
      finishDisplay(results, selectedTypes, thema, niveau, output, card);
      showError(err.message + ' — Das bisher erstellte Material wird angezeigt.');
    } else {
      card.style.display = 'none';
      showError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  } finally {
    setLoading(false);
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressContainer.classList.remove('visible');
      loadingMsg.classList.remove('visible');
      progressBar.style.width = '0%';
    }, 500);
  }
}

/* ── Finish display: final render + post-processing ──────── */
function finishDisplay(results, selectedTypes, thema, niveau, output, card) {
  const typeLabels = results.map(r => r.typeLabel).join(' + ');
  displayResult(results, typeLabels, thema, niveau);
}

/* ── Display result ───────────────────────────────────────── */
function displayResult(results, typeLabels, thema, niveau) {
  // results is an array of { typeVal, typeLabel, text }
  const output = document.getElementById('material-output');
  const combinedHtml = results.map((r, i) => {
    const section = renderMarkdown(r.text);
    // Add a page-break separator between sections (not before the first)
    const sep = i > 0 ? '<hr class="section-break">' : '';
    return sep + section;
  }).join('');

  output.innerHTML = DOMPurify.sanitize(combinedHtml, {
    ADD_TAGS: ['span'],
    ADD_ATTR: ['class'],
  });

  // Post-process: wrap each heading + next siblings in .print-keep
  // so they physically can't be split across pages
  output.querySelectorAll('h2, h3').forEach(heading => {
    if (heading.parentNode.classList?.contains('print-keep')) return;
    const siblings = [];
    let el = heading.nextElementSibling;
    while (el && siblings.length < 3 && !el.matches('h2, h3, hr')) {
      siblings.push(el);
      el = el.nextElementSibling;
    }
    if (siblings.length > 0) {
      const wrap = document.createElement('div');
      wrap.className = 'print-keep';
      heading.parentNode.insertBefore(wrap, heading);
      wrap.appendChild(heading);
      siblings.forEach(s => wrap.appendChild(s));
    }
  });

  // Also wrap bold paragraphs (sub-headers like "Nützliche Redemittel:") with next sibling
  output.querySelectorAll('p > strong:first-child').forEach(strong => {
    const p = strong.parentNode;
    if (p.parentNode.classList?.contains('print-keep')) return;
    if (p.childNodes.length <= 2) { // just <strong> + maybe text
      const next = p.nextElementSibling;
      if (next && !next.matches('h2, h3, hr, p > strong')) {
        const wrap = document.createElement('div');
        wrap.className = 'print-keep';
        p.parentNode.insertBefore(wrap, p);
        wrap.appendChild(p);
        wrap.appendChild(next);
      }
    }
  });

  document.getElementById('result-meta').textContent =
    `${typeLabels} · ${thema} · ${niveau}`;

  const card = document.getElementById('result-card');
  card.style.display = 'block';

  const combinedMarkdown = results.map(r => r.text).join('\n\n---\n\n');
  saveToHistory({ typeLabel: typeLabels, thema, niveau, markdown: combinedMarkdown, html: combinedHtml });
}

/* ── Minimal Markdown renderer ────────────────────────────── */
function renderMarkdown(md) {
  md = md.replace(/^_{5,}\s*$/gm, '%%WRITELINE%%');
  // Strip any "Zielgruppe" lines or inline mentions Claude may still include
  md = md.replace(/\s*\|\s*\*\*Zielgruppe:\*\*[^\n]*/g, '');
  md = md.replace(/^\*\*Zielgruppe:\*\*[^\n]*\n?/gm, '');
  // Strip "Ende des Materials" and similar ending markers
  md = md.replace(/^#{1,3}\s*Ende\b.*$/gm, '');
  md = md.replace(/^\*\*Ende\b.*\*\*\s*$/gm, '');
  md = md.replace(/^---+\s*$/gm, m => m); // keep normal HRs but trim trailing ones
  md = md.replace(/(\n---+\s*)+$/g, ''); // remove trailing HRs at end of document

  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/%%WRITELINE%%/g, '<span class="write-line"></span>');

  // [Bild] → visual image placeholder box
  html = html.replace(/\[Bild\]/g, '<span class="img-placeholder">🖼</span>');

  html = html.replace(
    /(?:^\|.+\|\n)+/gm,
    block => {
      const rows = block.trim().split('\n');
      let table = '<table>';
      rows.forEach((row, i) => {
        if (/^\|[-| :]+\|$/.test(row.trim())) return;
        const cells = row.trim().replace(/^\||\|$/g, '').split('|');
        const tag = (i === 0) ? 'th' : 'td';
        table += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      });
      return table + '</table>';
    }
  );

  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Wrap Wörterbox sections with the word-bank style
  html = html.replace(/(<strong>Wörterbox:<\/strong>\n?)([^\n<][^\n]*)/g,
    '<div class="word-bank"><strong>Wörterbox:</strong> $2</div>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/((?:^- .+\n?)+)/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '').trim()}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists – deferred-open so blank lines & extra write-lines between items
  // don't reset the counter back to 1
  {
    const lines = html.split('\n');
    const out = [];
    let olOpen = false, olNum = 1, pendingStart = null;
    for (const line of lines) {
      const m = line.match(/^(\d+)\. (.+)$/);
      if (m) {
        const itemNum = parseInt(m[1], 10);
        if (!olOpen) {
          out.push(`<ol start="${pendingStart !== null ? pendingStart : itemNum}">`);
          olOpen = true; pendingStart = null;
        }
        out.push(`<li>${m[2]}</li>`);
        olNum = itemNum + 1;
      } else if (line.includes('write-line') && (olOpen || pendingStart !== null)) {
        if (olOpen) { out.push('</ol>'); olOpen = false; pendingStart = olNum; }
        out.push(line);
      } else if (line.trim() === '' && (olOpen || pendingStart !== null)) {
        out.push(line); // keep blank lines inside list context without closing
      } else {
        if (olOpen) { out.push('</ol>'); olOpen = false; }
        if (line.trim()) pendingStart = null; // real content resets continuation
        out.push(line);
      }
    }
    if (olOpen) out.push('</ol>');
    html = out.join('\n');
  }

  html = html.replace(/^(?!<[htuo]).+$/gm, line => {
    if (line.trim() === '') return '';
    return `<p>${line}</p>`;
  });

  html = html.replace(/\n{2,}/g, '\n');
  return html;
}

/* ── Copy to clipboard ────────────────────────────────────── */
function copyMaterial() {
  const output = document.getElementById('material-output');
  const text = output.innerText;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => flashCopyBtn()).catch(fallbackCopy.bind(null, text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy() {
  const btn = document.querySelector('.result-toolbar .btn-secondary');
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '&#9888; Strg+A dann Strg+C';
  btn.style.background = '#fef9c3';
  btn.style.color = '#854d0e';
  setTimeout(() => { btn.innerHTML = orig; btn.style = ''; }, 3000);
}

function flashCopyBtn() {
  const btn = document.querySelector('.result-toolbar .btn-secondary');
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '&#10003; Kopiert!';
  btn.style.background = '#dcfce7';
  btn.style.color = '#15803d';
  setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; }, 2000);
}

/* ── PDF via print popup ──────────────────────────────────── */
function printMaterial() {
  const content = document.getElementById('material-output').innerHTML;
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Bitte Popups für diese Seite erlauben.'); return; }
  win.document.write(`<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<title></title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 0mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 2;
    color: #000;
    background: #fff;
    padding: 1.5cm 2.2cm 1.2cm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h2 { font-size:15pt; font-weight:800; border-bottom:1.5pt solid #333; padding-bottom:6pt; margin:22pt 0 12pt; break-after:avoid; page-break-after:avoid; }
  h2:first-child { margin-top:0; }
  h3 { font-size:12.5pt; font-weight:700; color:#111; margin:20pt 0 8pt; padding-top:6pt; break-after:avoid; page-break-after:avoid; }
  h4 { font-size:11.5pt; font-weight:700; color:#111; margin:16pt 0 6pt; break-after:avoid; page-break-after:avoid; }
  p { margin:6pt 0; orphans:3; widows:3; }
  strong { color:#000; }
  em { font-style:italic; }
  hr { border:none; border-top:.75pt solid #bbb; margin:16pt 0; }
  ul, ol { padding-left:1.2cm; margin:8pt 0; }
  li { margin:5pt 0; line-height:2; }
  table { width:100%; border-collapse:collapse; font-size:10.5pt; margin:12pt 0; page-break-inside:avoid; break-inside:avoid; }
  th, td { border:.75pt solid #aaa; padding:6pt 8pt; vertical-align:top; line-height:1.7; }
  th { background:#f0f0f0; font-weight:700; }
  .write-line { border-bottom:1pt solid #888; min-height:1cm; margin:6pt 0; display:block; }
  .word-bank { margin:10pt 0; padding:10pt 14pt; border:1.5pt solid #bae6fd; border-radius:8px; background:#f0f9ff; page-break-inside:avoid; break-inside:avoid; }
  .print-keep { break-inside:avoid; page-break-inside:avoid; }
  a { text-decoration:none; color:#000; }
  hr.section-break { display:none; }
</style>
</head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

/* ── Word download via native Word HTML format (no library) ── */
function saveAsWord() {
  const content = document.getElementById('material-output').innerHTML;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 11.5pt; line-height: 2; margin: 2cm; }
      h2 { font-size: 15pt; font-weight: bold; border-bottom: 1px solid #333; margin: 22pt 0 12pt; padding-bottom: 4pt; }
      h3 { font-size: 12.5pt; font-weight: bold; margin: 20pt 0 8pt; }
      p { margin: 6pt 0; }
      ul, ol { margin: 8pt 0; padding-left: 1.2cm; }
      li { margin: 5pt 0; }
      table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 12pt 0; }
      th, td { border: 1px solid #aaa; padding: 6pt 8pt; vertical-align: top; }
      th { background: #f0f0f0; font-weight: bold; }
      .write-line { border-bottom: 1px solid #888; display: block; min-height: 20pt; margin: 6pt 0; }
      .word-bank { border: 1px solid #7dd3fc; padding: 10pt 14pt; margin: 10pt 0; }
      hr { border: none; border-top: 1px solid #bbb; margin: 16pt 0; }
      hr.section-break { display: none; }
      a { text-decoration: none; color: #000; }
    </style></head>
    <body>${content}</body>
  </html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DeutschKurs_Material.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Reset ────────────────────────────────────────────────── */
function resetForm() {
  if (!window.confirm('Formular zurücksetzen? Alle Eingaben gehen verloren.')) return;
  document.getElementById('result-card').style.display = 'none';
  document.getElementById('topic').value = '';
  document.getElementById('target-group').value = '';
  document.getElementById('details').value = '';
  document.getElementById('goal-custom').value = '';
  document.querySelectorAll('#goal-chips input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
  document.querySelector('input[name="niveau"][value="A1"]').checked = true;
  document.querySelector('input[name="duration"][value="90 Minuten (Doppelstunde)"]').checked = true;
  document.querySelector('input[name="material-type"][value="lueckentext"]').checked = true;
  document.getElementById('topic').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── UI helpers ───────────────────────────────────────────── */
function setLoading(on) {
  const btn = document.getElementById('generate-btn');
  btn.disabled = on;
  btn.classList.toggle('loading', on);
  document.querySelectorAll('#generator-form input, #generator-form textarea, #generator-form button:not(#generate-btn)')
    .forEach(el => { el.disabled = on; });
}

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = '\u26A0 ' + msg;
  box.classList.add('visible');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('error-box').classList.remove('visible');
}

/* ── History ──────────────────────────────────────────────── */
const HISTORY_KEY = 'deutschkurs_history';
const MAX_HISTORY = 20;

function saveToHistory({ typeLabel, thema, niveau, markdown, html }) {
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    typeLabel, thema, niveau, markdown, html
  };
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { }
  renderHistoryPanel();
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function renderHistoryPanel() {
  const history = loadHistory();
  const card = document.getElementById('history-card');
  const list = document.getElementById('history-list');
  if (!history.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = DOMPurify.sanitize(history.map(e => `
    <div class="history-entry">
      <div class="history-entry-info">
        <strong>${escHtml(e.thema)}</strong>
        <span>${escHtml(e.typeLabel)} · ${escHtml(e.niveau)} · ${escHtml(e.timestamp)}</span>
      </div>
      <button class="btn btn-secondary" onclick="loadHistoryItem(${e.id})">🔁 Laden</button>
      <button class="btn btn-secondary" onclick="deleteHistoryItem(${e.id})" style="color:var(--danger)">🗑</button>
    </div>
  `).join(''));
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadHistoryItem(id) {
  const entry = loadHistory().find(e => e.id === id);
  if (!entry) return;
  const output = document.getElementById('material-output');
  output.innerHTML = DOMPurify.sanitize(entry.html, {
    ADD_TAGS: ['span'],
    ADD_ATTR: ['class'],
  });
  document.getElementById('result-meta').textContent = `${entry.typeLabel} · ${entry.thema} · ${entry.niveau}`;
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteHistoryItem(id) {
  const history = loadHistory().filter(e => e.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { }
  renderHistoryPanel();
}

// Initialise history on page load
renderHistoryPanel();
