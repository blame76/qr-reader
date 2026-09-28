(() => {
  'use strict';

  const STORAGE_KEY = '0815qr.history.v1';
  const MAX_HISTORY = 100;
  const SCAN_INTERVAL_MS = 220;
  const MAX_SCAN_EDGE = 1280;
  const $ = (selector) => document.querySelector(selector);

  let cameraStream = null;
  let scanFrame = null;
  let lastScanAt = 0;
  let currentResult = null;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  function hasDecoder() {
    return typeof window.jsQR === 'function' && !!context;
  }

  function setReaderSupport() {
    const el = $('#reader-support');
    if (!hasDecoder()) {
      el.textContent = 'QR-Decoder konnte nicht geladen werden. Seite neu laden oder die lokalen Dateien prüfen.';
      el.className = 'status bad';
      $('#start-camera').disabled = true;
      return;
    }
    if (!window.isSecureContext) {
      el.textContent = 'Bild-Scan ist bereit. Für die Kamera benötigt die Seite HTTPS oder localhost.';
      el.className = 'status warn';
      $('#start-camera').disabled = true;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      el.textContent = 'Bild-Scan ist bereit. Dieser Browser stellt keinen Kamerazugriff bereit.';
      el.className = 'status warn';
      $('#start-camera').disabled = true;
      return;
    }
    el.textContent = 'Reader bereit. Kamera läuft erst nach deinem Klick.';
    el.className = 'status good';
  }

  async function startCamera() {
    const support = $('#reader-support');
    if (!hasDecoder()) {
      setReaderSupport();
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      const video = $('#camera-video');
      video.srcObject = cameraStream;
      await video.play();
      $('#camera-card').hidden = false;
      support.textContent = 'Kamera aktiv – QR-Code in den Rahmen halten.';
      support.className = 'status good';
      lastScanAt = 0;
      scanFrame = window.requestAnimationFrame(scanVideoFrame);
    } catch (error) {
      support.textContent = `Kamera konnte nicht gestartet werden: ${friendlyCameraError(error)}`;
      support.className = 'status bad';
      stopCamera();
    }
  }

  function friendlyCameraError(error) {
    if (error?.name === 'NotAllowedError') return 'Kamerazugriff wurde nicht erlaubt.';
    if (error?.name === 'NotFoundError') return 'Keine passende Kamera gefunden.';
    if (error?.name === 'NotReadableError') return 'Kamera ist bereits belegt oder nicht verfügbar.';
    return error?.message || 'Unbekannter Fehler.';
  }

  function stopCamera() {
    if (scanFrame) window.cancelAnimationFrame(scanFrame);
    scanFrame = null;
    if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    const video = $('#camera-video');
    if (video) video.srcObject = null;
    const card = $('#camera-card');
    if (card) card.hidden = true;
  }

  function scanVideoFrame(timestamp) {
    if (!cameraStream) return;
    const video = $('#camera-video');

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && timestamp - lastScanAt >= SCAN_INTERVAL_MS) {
      lastScanAt = timestamp;
      const value = decodeDrawable(video, video.videoWidth, video.videoHeight);
      if (value) {
        stopCamera();
        handleScan(value);
        return;
      }
    }

    scanFrame = window.requestAnimationFrame(scanVideoFrame);
  }

  function decodeDrawable(source, sourceWidth, sourceHeight) {
    if (!hasDecoder() || !sourceWidth || !sourceHeight) return null;

    const scale = Math.min(1, MAX_SCAN_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    canvas.width = width;
    canvas.height = height;
    context.drawImage(source, 0, 0, width, height);

    try {
      const imageData = context.getImageData(0, 0, width, height);
      const code = window.jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
      return code?.data ? String(code.data) : null;
    } catch (_) {
      return null;
    }
  }

  $('#start-camera').addEventListener('click', startCamera);
  $('#stop-camera').addEventListener('click', stopCamera);

  $('#image-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const support = $('#reader-support');
    if (!hasDecoder()) {
      setReaderSupport();
      return;
    }

    try {
      const value = await decodeImageFile(file);
      if (!value) throw new Error('Auf dem Bild wurde kein QR-Code erkannt.');
      handleScan(value);
    } catch (error) {
      support.textContent = `Bild konnte nicht gelesen werden: ${error.message}`;
      support.className = 'status bad';
    }
  });

  async function decodeImageFile(file) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      try {
        return decodeDrawable(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close?.();
      }
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      return decodeDrawable(image, image.naturalWidth, image.naturalHeight);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Bildformat konnte nicht gelesen werden.'));
      image.src = src;
    });
  }

  function classify(value) {
    const trimmed = value.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        return {
          type: 'url',
          title: 'Webadresse',
          label: url.hostname,
          value: trimmed,
          openable: true
        };
      } catch (_) {}
    }

    return {
      type: 'text',
      title: 'Text',
      label: 'QR-Inhalt',
      value: trimmed,
      openable: false
    };
  }

  function handleScan(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) {
      const support = $('#reader-support');
      support.textContent = 'Der QR-Code enthält keinen lesbaren Inhalt.';
      support.className = 'status bad';
      return;
    }

    currentResult = classify(value);
    renderResult(currentResult);
    saveHistory(currentResult);
    renderHistory();
  }

  function renderResult(result) {
    $('#scan-result').hidden = false;
    $('#result-type').textContent = result.title;
    $('#result-label').textContent = result.label;
    $('#result-value').textContent = result.value;
    $('#result-open').hidden = !result.openable;
    $('#scan-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#result-open').addEventListener('click', () => {
    if (!currentResult?.openable) return;
    window.open(currentResult.value, '_blank', 'noopener,noreferrer');
  });

  $('#result-copy').addEventListener('click', async () => {
    if (!currentResult) return;
    await copyText(currentResult.value);
    flashButton($('#result-copy'), 'Kopiert');
  });

  async function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  function flashButton(button, text) {
    const original = button.textContent;
    button.textContent = text;
    window.setTimeout(() => { button.textContent = original; }, 1100);
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeHistory(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
      return true;
    } catch (_) {
      const support = $('#reader-support');
      support.textContent = 'Der Scan wurde erkannt, aber der lokale Verlauf konnte nicht gespeichert werden.';
      support.className = 'status bad';
      return false;
    }
  }

  function saveHistory(result) {
    const now = new Date().toISOString();
    const items = readHistory();
    const existingIndex = items.findIndex((item) => item.value === result.value);

    if (existingIndex >= 0) {
      const existing = items.splice(existingIndex, 1)[0];
      items.unshift({
        ...existing,
        type: result.type,
        label: result.label,
        lastSeen: now
      });
    } else {
      items.unshift({
        value: result.value,
        type: result.type,
        label: result.label,
        firstSeen: now,
        lastSeen: now
      });
    }

    writeHistory(items);
  }

  function formatWhen(iso) {
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    return sameDay
      ? `Heute ${new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date)}`
      : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function renderHistory() {
    const items = readHistory();
    const list = $('#history-list');
    const empty = $('#history-empty');
    $('#history-count').textContent = String(items.length);
    list.replaceChildren();
    empty.hidden = items.length > 0;

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'history-item';

      const body = document.createElement('div');
      body.className = 'history-body';

      const title = document.createElement('strong');
      title.textContent = item.type === 'url' ? item.label || 'Webadresse' : 'Text';

      const value = document.createElement('div');
      value.className = 'history-value';
      value.textContent = item.value;

      const meta = document.createElement('div');
      meta.className = 'history-meta';
      meta.textContent = formatWhen(item.lastSeen);

      body.append(title, value, meta);

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      if (item.type === 'url' && /^https?:\/\//i.test(item.value)) {
        const open = document.createElement('button');
        open.className = 'button small primary';
        open.type = 'button';
        open.textContent = 'Öffnen';
        open.addEventListener('click', () => window.open(item.value, '_blank', 'noopener,noreferrer'));
        actions.append(open);
      }

      const copy = document.createElement('button');
      copy.className = 'button small secondary';
      copy.type = 'button';
      copy.textContent = 'Kopieren';
      copy.addEventListener('click', async () => {
        await copyText(item.value);
        flashButton(copy, 'Kopiert');
      });

      const remove = document.createElement('button');
      remove.className = 'text-button danger';
      remove.type = 'button';
      remove.textContent = 'Löschen';
      remove.addEventListener('click', () => removeHistoryItem(item.value));

      actions.append(copy, remove);
      card.append(body, actions);
      list.append(card);
    });
  }

  function removeHistoryItem(value) {
    writeHistory(readHistory().filter((item) => item.value !== value));
    renderHistory();
  }

  $('#clear-history').addEventListener('click', () => {
    if (!readHistory().length) return;
    if (!window.confirm('Gesamten lokalen QR-Verlauf löschen?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  });

  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCamera();
  });
  setReaderSupport();
  renderHistory();
})();
