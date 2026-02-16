  1. Das Tab-Konzept im Header
   * Tab "Filter" (Standard):
       * Links: Sidebar mit Tags und Scopes.
       * Rechts: Cardlayout toggled 
            * Die bekannte Dateiliste mit Suchfeldern im Header.
            * File-Preview-Panel (bei Auswahl einer Datei) nur WEbansicht.
   * Tab "Daten" (Export/API):
       * Links: Neue Sidebar mit zwei Sektionen: "API-Keys" und "Rulesets".
       * Mitte/Hauptbereich: Detailansicht des links gewählten Elements. Keine Modals mehr für API-Keys oder Rulesets – alles wird direkt großflächig editiert.
       * Header: Suchfelder verschwinden; Tabs rücken ins Zentrum.


  2. Der "Daten"-Bereich im Detail
   * Wenn du links auf einen API-Key klickst:
       * Hauptbereich zeigt Namen, Key-String, Berechtigungen (Tags) und verknüpfte Rulesets.
       * Direkt integriert: Der "Full Context Test" (den wir gerade als Seite gebaut haben), um sofort zu sehen, was dieser Key liefert.
   * Wenn du links auf ein Ruleset klickst:
       * Hauptbereich zeigt den Editor für die Regeln (Regel-Liste, Test-Text-Bereich) für den Apikey
         dann geht auch add Rule. 


  3. Technische Umsetzung
   * Routing:
       * / -> Filter-Ansicht.
       * /data -> Export-Ansicht (Standard-Auswahl: erster API-Key).
       * /data/key/:id -> Spezifischer API-Key.
       * /data/ruleset/:id -> Spezifisches Ruleset.
   * Store: Ein neuer State activeMainTab im useAppStore, um zwischen den Welten zu wechseln.

  Meine Rückfragen zum Plan:

   1. Dateivorschau im Export-Bereich: Wenn man im "Daten"-Tab ein Ruleset bearbeitet, brauchen wir oft  einen Test-Text. 
   -> siehe 2. Der "Daten"-Bereich im Detail?
   
   2. Löschen/Erstellen: Da wir keine Modals mehr wollen, brauchen wir in der Sidebar wahrscheinlich kleine "Plus"-Icons neben den Überschriften (API-Keys +, Rulesets +). Einverstanden? 
   -->Ja
   
   3. Was passiert mit "Settings"? Die API-Key- und Ruleset-Einstellungen ziehen ja komplett in den "Daten"-Tab um. Bleibt unter "Settings" nur noch Profil-Kram (Passwort, Sprache) übrig,
      oder lösen wir den Settings-Button komplett auf und schieben den Rest in ein User-Menü? 
   --> ERstmal lassen
