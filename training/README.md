# MangaForge – Trainingsvorbereitung

Dieses Verzeichnis bereitet ein späteres Fine-Tuning eines frei lizenzierten Bildmodells vor. **Es enthält kein trainiertes Modell und startet kein Training.**

## Datenquellen
- Eigene Bilder: nur mit Nutzungsrechten und Zustimmung der jeweiligen Rechteinhaber.
- Externe Bilder: nur mit dokumentierter Lizenz, die die geplante ML-Nutzung, Bearbeitung und Weitergabe erlaubt. Lizenzbedingungen einzeln prüfen; „kostenlos verfügbar“ ist keine Lizenz.
- Keine unberechtigt übernommenen Manga-Seiten oder urheberrechtlich geschützten Figuren.

## Ablauf
1. Metadaten in `manifest.example.jsonl` nach dem Schema ergänzen.
2. Originalbilder **nicht** ins öffentliche GitHub-Repository laden. Lokale/private Datenspeicherung verwenden.
3. Mit `python training/validate_manifest.py /pfad/manifest.jsonl` Metadaten prüfen.
4. Erst danach ein kompatibles Basismodell, Lizenz, Rechenumgebung und Fine-Tuning-Methode auswählen.
5. Trainings-/Validierungsdaten nach Werken oder Figuren trennen, um Datenleckage zu vermeiden.

## Datenschutz
Keine persönlichen Fotos oder Daten Dritter ohne Erlaubnis. Keine Zugangsschlüssel in Manifesten speichern. Die Validierung kontrolliert Metadaten, **nicht** automatisch die Echtheit einer Lizenz.
