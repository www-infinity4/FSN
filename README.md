# FSN — Full Game Sports Network

FSN is a synchronized professional-sports channel built on the same live-channel pattern as the Infinity TV network.

## Current programming model

- Major and professional sports only.
- Baseball is primary during baseball season.
- Eight synchronized 3-hour game windows per viewer-local day: 12 AM, 3 AM, 6 AM, 9 AM, 12 PM, 3 PM, 6 PM and 9 PM.
- The daily lineup changes at 12:00 AM in the viewer's local time.
- The selection is reseeded weekly so a new week produces a different rotation.
- The scheduler avoids same-day repeats while the verified source pool allows it and tries to keep the same team out of consecutive slots.
- Client playback failures never reshuffle the schedule, so viewers remain synchronized.
- The 5:00–6:00 PM local hour is reserved as a highlights fallback. Full games remain preferred; highlights are used only when the scheduled full-game source cannot fill its window.

## Source policy

The initial baseball pool uses official MLB / World Baseball Classic full-game uploads where available. A source can disappear or become non-embeddable later; FSN holds the scheduled slot instead of silently changing everybody to a different game.

## Shared remote

`channels.js` first renders a local fallback remote so FSN always has navigation. It then attempts to load the master list from:

`https://raw.githubusercontent.com/www-infinity4/Omni-Control/main/channels.json`

Once the `Omni-Control` repository and `channels.json` exist, FSN will automatically use that central channel list without needing a new FSN commit. Older channel repos will each need the same lightweight shared-remote loader once so future additions can be controlled centrally.

Expected master format:

```json
{
  "channels": [
    {"name":"FSN","slug":"FSN","url":"https://www-infinity4.github.io/FSN/","group":"TV"}
  ]
}
```

## Files

- `index.html` — station UI and social metadata
- `app.js` — synchronized 3-hour scheduler/player
- `data/catalog.js` — full-game and highlights source pools
- `channels.js` — Omni Control remote loader + fallback list
- `styles.css` — responsive channel styling
