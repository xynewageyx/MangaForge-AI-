# MangaForge AI: kostenlos als Android-Web-App bereitstellen

## Hosting

Cloudflare Workers Free (nutzungsabhängige Limits). Das bestehende Lovable-Vite-Setup erzeugt beim `bun run build` über Nitro bereits `.output/server/wrangler.json` und `.output/public`. **Nicht GitHub Pages** verwenden: TanStack Start braucht SSR.

## Einmalige Einrichtung am Android-Smartphone

1. Cloudflare-Konto erstellen oder anmelden: https://dash.cloudflare.com/
2. Unter Workers & Pages einen Workers-Subdomain-Namen (`*.workers.dev`) einrichten.
3. Cloudflare **Account ID** im Cloudflare-Dashboard kopieren.
4. Unter Cloudflare > My Profile > API Tokens ein Token mit **Account > Workers Scripts > Edit** für dieses Konto erstellen. Token niemals in Code oder Chat posten.
5. Im GitHub-Repository unter **Settings > Secrets and variables > Actions > New repository secret** diese beiden Secrets anlegen:
   - `CLOUDFLARE_ACCOUNT_ID` (Account ID)
   - `CLOUDFLARE_API_TOKEN` (API-Token)
6. GitHub > **Actions > Deploy MangaForge Android Web App > Run workflow** auf `main` starten.
7. Nach erfolgreichem Deploy die `https://…workers.dev`-Adresse im Deploy-Log öffnen.
8. In Chrome auf Android die Adresse öffnen > Drei-Punkte-Menü > **Zum Startbildschirm hinzufügen** bzw. **App installieren**.

## Technischer Ablauf

Der Deploy-Workflow prüft TypeScript und Tests, baut die App, prüft die von Nitro generierte Worker-Konfiguration und veröffentlicht den vorgefertigten Worker mit `bunx nitro deploy --prebuilt`. Der Workflow wird **nur manuell** gestartet und verlangt die beiden Secrets. Für den normalen Code-Test läuft weiterhin `MangaForge CI` automatisch.

## Sicherheit und Einschränkungen

- Die App speichert Projekte im IndexedDB-Speicher des **jeweiligen Browsers/Geräts**. Sie synchronisiert **nicht** automatisch zwischen Geräten.
- Vor Browserwechsel, App-Löschung oder dem Löschen von Browserdaten unbedingt eine **JSON-Sicherung herunterladen**.
- Die Web-App hat Manifest und Symbol, aber noch keinen Service Worker: **Offline-Verfügbarkeit ist nicht garantiert**.
- Hosting ist nicht automatisch ein KI-Bild-/Videogenerator. Externe KI-Anbieter benötigen eigene Integration und gegebenenfalls Gebühren.
- Cloudflare-Free-Nutzung unterliegt aktuellen Limits; GitHub Actions ebenfalls.
- Deployment ist erst abgeschlossen, wenn der Workflow erfolgreich läuft und die `workers.dev`-Adresse im Android-Browser getestet wurde.

## Fehlerdiagnose

GitHub > Actions > Deploy MangaForge Android Web App > letzten Lauf öffnen. Fehlermeldungen im Schritt `Deploy prebuilt Nitro app to Cloudflare Workers` prüfen. Wenn Nitro die generierte Wrangler-Konfiguration nicht erkennt, den Workflow-Log prüfen, bevor Build-Adapter verändert werden.
