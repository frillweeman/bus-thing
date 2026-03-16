import React, { useEffect, useMemo, useState } from "react";
import { DeskThing } from "@deskthing/client";

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

const BUS_EVENT = "bus_departures";
const BUS_SNAPSHOT_REQUEST = "bus_snapshot";

const formatDeparture = (epochMs: number): string =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(epochMs));

const getUrgencyColor = (minutesUntilDeparture: number): string => {
  if (minutesUntilDeparture < 8) return "hsl(0 85% 55%)";
  if (minutesUntilDeparture < 15) return "hsl(30 90% 55%)";
  return "hsl(120 70% 50%)";
};

const App: React.FC = () => {
  const [payload, setPayload] = useState<BusDeparturesPayload | null>(null);

  useEffect(() => {
    const removeBusListener = DeskThing.on(BUS_EVENT, (data) => {
      if (data.payload) {
        setPayload(data.payload as BusDeparturesPayload);
      }
    });

    // Server pushes automatically on CLIENT_STATUS.opened;
    // this is a fallback for cases where that event fires before our listener is ready
    DeskThing.send({ type: "get", request: BUS_SNAPSHOT_REQUEST });

    return () => {
      removeBusListener();
    };
  }, []);

  const generatedAtText = useMemo(() => {
    if (!payload) {
      return "Waiting for transit data...";
    }

    return `Updated ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(payload.generatedAtEpochMs))}`;
  }, [payload]);

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-white px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="space-y-2">
          <p className="text-4xl font-bold tracking-tight">RTD Departures</p>
          <p className="text-slate-300 text-lg">Boulder and Denver • next two fastest options</p>
          <p className="text-slate-400 text-sm">{generatedAtText}</p>
          {payload?.sourceMessage && (
            <p className="text-amber-300 text-sm font-semibold">{payload.sourceMessage}</p>
          )}
          {payload?.stale && <p className="text-amber-400 text-sm">Showing last known departures.</p>}
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {(payload?.groups ?? []).map((group) => (
            <section
              key={group.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">{group.label}</h2>
                <span className="text-slate-400 text-sm">Top 2</span>
              </div>

              {group.doneForToday ? (
                <div className="rounded-xl border border-amber-400/50 bg-amber-400/15 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-200">{group.doneMessage || "That's all for today"}</p>
                  {group.nextDepartureEpochMs && (
                    <p className="text-amber-100 mt-1">
                      Next departure: {formatDeparture(group.nextDepartureEpochMs)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {group.departures.map((departure) => (
                    <article
                      key={`${departure.routeLabel}-${departure.directionLabel}-${departure.stopId}-${departure.departureEpochMs}`}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{departure.routeLabel}</p>
                        <p
                          className="text-xl font-extrabold"
                          style={{
                            color: getUrgencyColor(departure.minutesUntilDeparture),
                          }}
                        >
                          {departure.minutesUntilDeparture} min
                        </p>
                      </div>
                      <p className="text-slate-300">{departure.directionLabel}</p>
                      <p className="text-slate-400 text-sm">
                        {formatDeparture(departure.departureEpochMs)} •{" "}
                        {departure.stopName || `Stop ${departure.stopId}`}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
