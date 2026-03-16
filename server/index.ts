import gtfsRealtimeBindings from "gtfs-realtime-bindings";
import { DeskThing } from "@deskthing/server";
import { AppSettings, DESKTHING_EVENTS } from "@deskthing/types";
import { transitConfig } from "./transitConfig";

type DepartureItem = {
  routeLabel: string;
  directionLabel: string;
  stopId: string;
  stopName: string;
  departureEpochMs: number;
  minutesUntilDeparture: number;
};

type CityDepartures = {
  id: "boulder" | "denver";
  label: string;
  doneForToday: boolean;
  doneMessage: string;
  nextDepartureEpochMs: number | null;
  departures: DepartureItem[];
};

type BusDeparturesPayload = {
  generatedAtEpochMs: number;
  stale: boolean;
  sourceStatus: "ok" | "error" | "not-configured";
  sourceMessage?: string;
  maxLookaheadMinutes: number;
  groups: CityDepartures[];
};

type FeedMessage = ReturnType<typeof gtfsRealtimeBindings.transit_realtime.FeedMessage.decode>;

const BUS_EVENT = "bus_departures";
const BUS_SNAPSHOT_REQUEST = "bus_snapshot";

let cancelPolling: (() => void) | null = null;
let lastSnapshot: BusDeparturesPayload | null = null;

const getDenverDateKey = (epochMs: number): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: transitConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(epochMs));
};

const readTripDirectionId = (tripUpdate: {
  trip?: {
    directionId?: number | null;
  } | null;
}): number | null => {
  const directionId = tripUpdate.trip?.directionId;
  if (directionId === undefined || directionId === null) {
    return null;
  }
  return Number(directionId);
};

const decodeFeed = (rawBytes: ArrayBuffer): FeedMessage => {
  const buffer = Buffer.from(rawBytes);
  return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
};

const getStopDepartureMs = (stopTimeUpdate: {
  departure?: { time?: string | number | null } | null;
  arrival?: { time?: string | number | null } | null;
}): number | null => {
  const value = stopTimeUpdate.departure?.time ?? stopTimeUpdate.arrival?.time;
  if (value === undefined || value === null) {
    return null;
  }

  const numericSeconds = Number(value);
  if (!Number.isFinite(numericSeconds)) {
    return null;
  }

  return numericSeconds * 1000;
};

const buildDeparturesPayload = (feed: FeedMessage, nowEpochMs: number): BusDeparturesPayload => {
  const nowDateKey = getDenverDateKey(nowEpochMs);

  const groups: CityDepartures[] = transitConfig.cities.map((city) => {
    const allMatches: DepartureItem[] = [];

    for (const route of city.routes) {
      if (!route.routeId || route.stops.length === 0) {
        continue;
      }

      for (const entity of feed.entity ?? []) {
        const tripUpdate = entity.tripUpdate;
        if (!tripUpdate?.trip || !tripUpdate.stopTimeUpdate) {
          continue;
        }

        const routeId = tripUpdate.trip.routeId ?? "";
        if (routeId !== route.routeId) {
          continue;
        }

        const tripDirectionId = readTripDirectionId(tripUpdate);
        if (city.directionId !== null && city.directionId !== tripDirectionId) {
          continue;
        }

        for (const stopTimeUpdate of tripUpdate.stopTimeUpdate) {
          const stopId = stopTimeUpdate.stopId ?? "";
          const stopTarget = route.stops.find((s) => s.id === stopId);
          if (!stopTarget) {
            continue;
          }

          const departureEpochMs = getStopDepartureMs(stopTimeUpdate);
          if (!departureEpochMs || departureEpochMs < nowEpochMs) {
            continue;
          }

          const minutesUntilDeparture = Math.ceil((departureEpochMs - nowEpochMs) / 60000);
          allMatches.push({
            routeLabel: route.label,
            directionLabel: city.directionLabel,
            stopId,
            stopName: stopTarget.name,
            departureEpochMs,
            minutesUntilDeparture,
          });
        }
      }
    }

    const deduped = new Map<string, DepartureItem>();
    for (const candidate of allMatches) {
      const key = `${candidate.routeLabel}:${candidate.directionLabel}:${candidate.stopId}:${candidate.departureEpochMs}`;
      if (!deduped.has(key)) {
        deduped.set(key, candidate);
      }
    }

    const sorted = Array.from(deduped.values()).sort(
      (left, right) => left.departureEpochMs - right.departureEpochMs
    );
    const next = sorted[0];

    if (!next) {
      return {
        id: city.id,
        label: city.label,
        doneForToday: true,
        doneMessage: transitConfig.doneForTodayText,
        nextDepartureEpochMs: null,
        departures: [],
      };
    }

    const nextDateKey = getDenverDateKey(next.departureEpochMs);
    const isTomorrowOrLater = nextDateKey !== nowDateKey;
    const exceedsLookahead = next.minutesUntilDeparture > transitConfig.maxLookaheadMinutes;
    const doneForToday = isTomorrowOrLater || exceedsLookahead;

    return {
      id: city.id,
      label: city.label,
      doneForToday,
      doneMessage: doneForToday ? transitConfig.doneForTodayText : "",
      nextDepartureEpochMs: next.departureEpochMs,
      departures: doneForToday ? [] : sorted.slice(0, 2),
    };
  });

  return {
    generatedAtEpochMs: nowEpochMs,
    stale: false,
    sourceStatus: "ok",
    maxLookaheadMinutes: transitConfig.maxLookaheadMinutes,
    groups,
  };
};

const publishSnapshot = (payload: BusDeparturesPayload): void => {
  lastSnapshot = payload;
  DeskThing.send({ type: BUS_EVENT, payload });
};

const buildNotConfiguredSnapshot = (): BusDeparturesPayload => {
  const nowEpochMs = Date.now();
  return {
    generatedAtEpochMs: nowEpochMs,
    stale: false,
    sourceStatus: "not-configured",
    sourceMessage: "Set transitConfig.feedUrl, routeId, directionId, and stopIds to begin.",
    maxLookaheadMinutes: transitConfig.maxLookaheadMinutes,
    groups: transitConfig.cities.map((city) => ({
      id: city.id,
      label: city.label,
      doneForToday: true,
      doneMessage: transitConfig.doneForTodayText,
      nextDepartureEpochMs: null,
      departures: [],
    })),
  };
};

const refreshDepartures = async (): Promise<void> => {
  if (!transitConfig.feedUrl) {
    publishSnapshot(buildNotConfiguredSnapshot());
    return;
  }

  try {
    const response = await fetch(transitConfig.feedUrl);
    if (!response.ok) {
      throw new Error(`Feed request failed with status ${response.status}`);
    }

    const rawBytes = await response.arrayBuffer();
    const feed = decodeFeed(rawBytes);
    const payload = buildDeparturesPayload(feed, Date.now());
    publishSnapshot(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GTFS-RT error";

    if (lastSnapshot) {
      publishSnapshot({
        ...lastSnapshot,
        stale: true,
        sourceStatus: "error",
        sourceMessage: message,
      });
      return;
    }

    publishSnapshot({
      generatedAtEpochMs: Date.now(),
      stale: true,
      sourceStatus: "error",
      sourceMessage: message,
      maxLookaheadMinutes: transitConfig.maxLookaheadMinutes,
      groups: transitConfig.cities.map((city) => ({
        id: city.id,
        label: city.label,
        doneForToday: true,
        doneMessage: transitConfig.doneForTodayText,
        nextDepartureEpochMs: null,
        departures: [],
      })),
    });
  }
};

const start = async () => {
  const settings: AppSettings = {};
  DeskThing.initSettings(settings);

  await refreshDepartures();

  cancelPolling = DeskThing.setInterval(async () => {
    await refreshDepartures();
  }, transitConfig.pollingIntervalMs);
};

const stop = async () => {
  if (cancelPolling) {
    cancelPolling();
    cancelPolling = null;
  }
};

// Push snapshot directly when a client window opens/connects
DeskThing.on(DESKTHING_EVENTS.CLIENT_STATUS, async (data) => {
  if (data.request !== "opened" && data.request !== "connected") {
    return;
  }

  if (!lastSnapshot) {
    await refreshDepartures();
  }

  if (lastSnapshot) {
    const clientId = (data.payload as { clientId?: string } | undefined)?.clientId;
    DeskThing.send({ type: BUS_EVENT, payload: lastSnapshot, ...(clientId ? { clientId } : {}) });
  }
});

// Fallback: client explicitly requests latest snapshot
DeskThing.on("get", async (data) => {
  if (data.request !== BUS_SNAPSHOT_REQUEST) {
    return;
  }

  if (!lastSnapshot) {
    await refreshDepartures();
  }

  if (lastSnapshot) {
    DeskThing.send({ type: BUS_EVENT, request: BUS_SNAPSHOT_REQUEST, payload: lastSnapshot });
  }
});

DeskThing.on(DESKTHING_EVENTS.START, start);
DeskThing.on(DESKTHING_EVENTS.STOP, stop);