# 0815 QR Reader

Ein kleines Werkzeug: QR-Code mit Kamera oder Bilddatei lesen und den Inhalt später im lokalen Verlauf wiederfinden.

## Funktionen und Datenschutz

- QR-Code mit Kamera oder Bilddatei lesen.
- Erkannte Inhalte im Browser anzeigen und mit Scanzeitpunkten lokal speichern.
- Gleiche Inhalte aktualisieren statt duplizieren; höchstens 100 Einträge.
- `http://`- und `https://`-Links nur nach Klick öffnen.
- Inhalte kopieren und Verlaufseinträge einzeln oder vollständig löschen.
- Keine Cookies, Analytics, Accounts, Cloud-Synchronisation oder Hintergrundanfragen für Scan-Inhalte.

Der Verlauf speichert QR-Inhalte unverschlüsselt im `localStorage`. Ein QR-Code kann vertrauliche Daten enthalten. Andere Seiten mit derselben Origin (Schema, Host und Port) können auf diesen Speicher zugreifen. Für diesen Reader ist ein Unterverzeichnis von `blame76.com` geplant; diese gemeinsame Origin muss bei weiteren Seiten auf der Domain berücksichtigt werden.

Die QR-Erkennung nutzt die unveränderte Datei `assets/vendor/jsQR-1.4.0.js` aus dem npm-Paket `jsqr@1.4.0`. Das Paket hat die Registry-Integrität `sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==`; SHA-256 der eingebundenen Datei: `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`. Quelle: https://github.com/cozmo/jsQR. Lizenz: Apache-2.0, siehe `assets/vendor/jsQR-LICENSE.txt`. Projektcode: MIT, siehe `LICENSE`.

## Veröffentlichung

Auf den Webserver gehören `index.html`, `selfcheck.html`, `datenschutz.html`, `impressum.html` und der Ordner `assets/`. `tests/`, `README.md` und die Projektlizenz sind keine Website-Dateien. Bei Apache auch `.htaccess` kopieren. Der jsQR-Lizenztext unter `assets/vendor/` gehört zur Auslieferung.

**Hosting:** Die Seite wird bei STRATO betrieben. Die [STRATO-Logfile-FAQ](https://www.strato.de/faq/hosting/so-erfahren-sie-wie-oft-ihre-internet-seiten-besucht-worden-sind/) beschreibt die protokollierten Zugriffsdaten, deren Anonymisierung in den bereitgestellten Logfiles und deren Abrufbarkeit für die letzten sechs Wochen. STRATO nennt in einer [weiteren FAQ](https://www.strato.de/faq/vertrag/fragen-zur-auftragsverarbeitungsvertrag-avv-und-der-neuen-eu-datenschutzgrundverordnung-dsgvo/) eine maximale Speicherdauer von sieben Tagen für Besucher-IP-Adressen zur Angriffsabwehr. Die sechs Wochen sind keine Löschfrist für unveränderte IP-Adressen. Die aus dem blame76-Impressum übernommenen Kontaktangaben vor Veröffentlichung prüfen.

Die `.htaccess` ist für Apache mit `AllowOverride Options FileInfo AuthConfig` sowie `mod_headers` und `mod_rewrite` gedacht. `Options -Indexes` benötigt die passende Override-Berechtigung. Hinter einem TLS-Proxy muss die HTTPS-Weiterleitung an die tatsächliche Serverkonfiguration angepasst werden. Bei nginx oder Hosting ohne wirksame `.htaccess` dieselben Header und die HTTPS-Weiterleitung im Server konfigurieren. Die lokale CSP beschränkt Skripte und Styles auf die eigene Origin und blockiert Verbindungen aus der Anwendung.

Nach dem Upload prüfen:

1. Mit `curl -I https://<host>/0815/qr-code-reader/` CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` und `Permissions-Policy` kontrollieren. Es darf keine Reporting-Direktive geben.
2. HTTP muss auf HTTPS weiterleiten. Die URL zu `.htaccess` und `README.md` muss 403 oder 404 liefern; Verzeichnislisting muss aus sein.
3. In den Browser-DevTools beim Laden nur Anfragen an die eigene Origin sehen. Nach dem Laden Netzwerk auf Offline stellen und den Bild-Scan testen. Ein Offline-Neuladen ist ohne Service Worker nicht zugesagt.
4. Bild- und Kamera-Scan, Verlauf, Einzellöschung, Gesamtlöschung und das Stoppen der Kamera beim Tab-Wechsel testen. Dabei dürfen keine Anfragen mit Scan-Inhalten entstehen.
5. `selfcheck.html` muss den lokalen QR-Decoder als verfügbar melden.

## Lokaler Test

Für die Kamera benötigt die Seite HTTPS oder `localhost`. Lokal:

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080/selfcheck.html` aufrufen. Unter „Bild auswählen“ kann `tests/sample-menu-qr.png` getestet werden; erwartet wird `https://example.com/menu`.

QR Code ist eine eingetragene Marke von DENSO WAVE INCORPORATED.
