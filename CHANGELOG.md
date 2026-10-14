# Changelog

## [2026-10-13 23:07] - v3.22 no-scroll game layout on phones and tablets
Landscape gets a compact header, opponents strip, 2x2 board and a full-width hand. Phone portrait fits header, opponent chips, 4 suit rows, hand and pass bar on one screen. Board runs fan out only when a full run is wider than its row, so no card is cut off. Review fixes: lobby styles back at 601-768px, opponent-only name styles, dvh modal height, notch padding for modal and toasts, no clipped hover lift in compact layouts. index.html mobile.css cache-bust bumped.
Files: css/mobile.css, game.html, index.html
