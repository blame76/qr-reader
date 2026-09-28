(() => {
  'use strict';

  const checks = [];
  const add = (label, ok, detail, required = true) => checks.push({ label, ok, detail, required });

  add('QR-Decoder', typeof window.jsQR === 'function',
    typeof window.jsQR === 'function'
      ? 'jsQR 1.4.0 ist geladen; BarcodeDetector wird nicht benötigt.'
      : 'QR-Decoder konnte nicht geladen werden. Lokale Datei und CSP prüfen.');

  add('Sicherer Kontext', window.isSecureContext,
    window.isSecureContext ? 'HTTPS/localhost erkannt.' : 'Kamera funktioniert nur über HTTPS oder localhost.', false);

  add('Kamera-API', !!navigator.mediaDevices?.getUserMedia,
    navigator.mediaDevices?.getUserMedia ? 'Kamerazugriff ist grundsätzlich verfügbar.' : 'getUserMedia fehlt; Bilddateien können weiterhin funktionieren.', false);

  let storageOk = false;
  try {
    localStorage.setItem('0815qr.selfcheck', '1');
    storageOk = localStorage.getItem('0815qr.selfcheck') === '1';
    localStorage.removeItem('0815qr.selfcheck');
  } catch (_) {}
  add('Lokaler Verlauf', storageOk,
    storageOk ? 'localStorage ist verfügbar.' : 'Verlauf kann in diesem Browsermodus nicht lokal gespeichert werden.');

  const root = document.querySelector('#checks');
  checks.forEach((check) => {
    const row = document.createElement('div');
    row.className = `check-row ${check.ok ? 'good' : check.required ? 'bad' : 'warn'}`;
    const icon = document.createElement('div');
    icon.className = 'check-icon';
    icon.textContent = check.ok ? '✓' : check.required ? '×' : '!';
    const body = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = check.label;
    const detail = document.createElement('div');
    detail.className = 'muted';
    detail.textContent = check.detail;
    body.append(strong, detail);
    row.append(icon, body);
    root.append(row);
  });

  const summary = document.querySelector('#check-summary');
  const requiredOk = checks.filter((check) => check.required).every((check) => check.ok);
  if (requiredOk) {
    summary.textContent = window.isSecureContext && navigator.mediaDevices?.getUserMedia
      ? 'Reader und lokaler Verlauf können getestet werden.'
      : 'Bild-Reader und Verlauf sind bereit; Kamera braucht HTTPS/localhost und eine Kamera-API.';
    summary.className = 'status good';
  } else {
    summary.textContent = 'Mindestens eine notwendige Voraussetzung fehlt. Hinweise oben prüfen.';
    summary.className = 'status bad';
  }
})();
