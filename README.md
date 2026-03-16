# bus-thing

A [DeskThing](https://github.com/ItsRiprod/DeskThing) app that shows real-time RTD bus departures for two destination groups — Boulder and Denver — using a live GTFS-RT feed.

Each group displays the **two next soonest departures**, color-coded by urgency:

| Color | Time until departure |
|-------|----------------------|
| 🟢 Green | 15 min or more |
| 🟠 Orange | 8–14 min |
| 🔴 Red | Under 8 min |

If no bus is departing within 2 hours (or until tomorrow), the group shows a prominent **"No More Buses Today"** message instead.

## Requirements

- [DeskThing](https://github.com/ItsRiprod/DeskThing) ≥ 0.11.2
- Node.js (for local development)
- RTD GTFS-RT `TripUpdate.pb` feed access
- RTD static GTFS files to look up route/direction/stop IDs

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your routes

```bash
cp server/transitConfig.ts.example server/transitConfig.ts
```

Edit `server/transitConfig.ts` and fill in your values. IDs come from RTD's static GTFS zip, available at [rtd-denver.com/developers](https://www.rtd-denver.com/developers):

| Field | Source file | Column |
|-------|-------------|--------|
| `routeId` | `routes.txt` | `route_id` |
| `directionId` | `trips.txt` | `direction_id` (`0` or `1`) |
| stop `id` | `stops.txt` | `stop_id` |

`transitConfig.ts` is gitignored — your stop/route IDs stay local.

## Development

```bash
npm run dev
```

Navigate to **http://localhost:3000** (not 5173) to see the full client with live server messaging. The server fetches the feed immediately on start, then polls every 60 seconds, and hot-reloads on file edits within ~1 second.

## Build & Deploy

```bash
npm run build
```

Produces a `.zip` in `dist/`. In DeskThing: **Apps → Add App → Load from file**, then select the zip.

Since route config is baked into the server bundle, any changes to `transitConfig.ts` require a rebuild and reinstall.

## Project structure

```
server/
  index.ts                  # GTFS-RT polling, filtering, DeskThing server events
  transitConfig.ts          # Your local config (gitignored)
  transitConfig.ts.example  # Template — copy and fill in
src/
  App.tsx                   # Client UI — Boulder/Denver departure cards
deskthing/
  manifest.json             # App metadata for DeskThing
```
