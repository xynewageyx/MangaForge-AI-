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

## Bilddateien zusätzlich prüfen

Für einen Hugging-Face-ImageFolder-Datensatz kann `training/validate_dataset.py` eingesetzt werden:

```bash
python training/validate_dataset.py /pfad/zum/privaten/imagefolder
```

Dort muss `metadata.jsonl` pro Bild `file_name`, `text`, `license` und `source` enthalten. Dieser Validator prüft Bilddateien und Caption-Felder, nicht die Echtheit der Lizenzen. Das bestehende `validate_manifest.py` prüft separat den umfangreicheren Rechte-/Split-Nachweis. Beide Formate sind verschieden; eine Konvertierung zwischen ihnen ist noch nicht implementiert.

Trainingsreferenz: https://huggingface.co/docs/diffusers/en/training/create_dataset

**Wichtig:** Weder ein GPU-Training noch das Herunterladen eines Basismodells wurde gestartet. Ein späteres LoRA-Finetuning braucht ein geeignet lizenziertes Basismodell und eine GPU-Umgebung; das Android-Handy ist vor allem für Datensammlung und Projektsteuerung geeignet.
