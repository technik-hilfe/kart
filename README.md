# Mini Kart Cup 3D

Ein eigenstaendiges 3D-Kartspiel fuer den Browser mit zwei Bot-Gegnern,
drei Runden, dynamischer Position, Ergebnisanzeige, enger technischer Strecke
und dichtem Wald rund um den Kurs.

## Auf GitHub Pages veroeffentlichen

1. Ein neues GitHub-Repository erstellen.
2. **Alle Dateien aus diesem Ordner** in die oberste Ebene des Repositorys hochladen.
3. In GitHub `Settings` > `Pages` oeffnen.
4. Unter `Build and deployment` die Quelle `Deploy from a branch` waehlen.
5. Branch `main` und Ordner `/(root)` auswaehlen und speichern.

Es ist kein Build und keine Installation notwendig. `index.html` ist die
Startdatei; die benoetigte Three.js-Version liegt bereits lokal bei.

## Steuerung

- `W` oder Pfeil hoch: Gas
- `S` oder Pfeil runter: Bremsen/Rueckwaerts
- `A`: links lenken
- `D`: rechts lenken

Auf Touch-Geraeten werden Bildschirmtasten eingeblendet.

## Dateien

- `index.html` - Spielseite und Benutzeroberflaeche
- `styles.css` - Gestaltung und responsive Darstellung
- `game.js` - Strecke, Fahrphysik, Bots, Rennen und 3D-Welt
- `three.min.js` - lokale Three.js-Laufzeit
- `THREE-LICENSE.txt` - Lizenzhinweis zu Three.js
