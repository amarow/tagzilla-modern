# Entwicklungsplan: Tagzilla Modern

## Übergeordnetes Ziel
- eine Art Dokumenten Managenet System
- es sollen zunächst Dokumente vom eigenen Rechner eingelesen werden können
- anstatt einer hierarchischen Ordnerstruktur soll ein Tagging-System eingesetzt werden
- Die Dateiinhalte sollen zumindest angezeigt werden
- für spezielle Formate könnte man auch spezielle Tools öffnen (Word,Excel, ...)
- es sollen mehrere Quellverzeichnisse verwaltet werden können (Scopes)


## Backend (Node.js/Express)
- node.js + express + Typescript
- crawler Funktion liest bestimmte Files (Filter notwendig)
- Die FileHandles (Referenzen auf die echten Files) und Tags zu den Files werden in der DB abgelegt
- es können mehrere Tags zu einem File angefügt/entfernt werden
- der Server soll überwachen (watch Mode) und Änderungen (Dateiname, Datum, Size) zum Client posten
- der Server soll eine Index anlegen 

## Frontend (React/Vite)
- Typescript
- schlanken Techstack, React-Router, Zustand
- Browser, Smartphone, Tablet, Responsive
- schlanke Komponeten-lib Mantine
- Dark+Light Mode
- Die UI besteht aus drei Teilen Header (oben), Tags-Area (links) und File-List (rechts) 
- Der User arangiert seine Tags in der Tags-Area wie er möchte, 
- beim Selektieren eines Tags wird die File-List aktualisiert 
- im Header werden globale Daten angezeigt User, Scope, Filter
- Die aktuelle ansicht wird im UserStae persistiert und überlebt einen Browser Neustart


## Datenbank SQLite
- nur wenige Entitäten : FileHandle, Tag, Scope, Filter, User, UserState
- einfaches DB-Schema, oder JSON-Blobs

## Infrastruktur / Sonstiges
- soll nur lokal laufen
