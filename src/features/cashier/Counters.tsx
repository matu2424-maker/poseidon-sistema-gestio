import { useEffect, useState } from "react";
import type { AppData, Balance, Reading, ReadingStatus, User } from "../../types";
import { counter, formatCounterInput, money, parseCounter } from "../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";

function InfoCard({ title, lines, tone }: { title: string; lines: string[]; tone: "blue" | "green" | "orange" | "red" }) {
  return (
    <article className={`info-card ${tone}`}>
      <h3>{title}</h3>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

type CounterSortKey = "visibleId" | "machine" | "status" | "inPrevious" | "inActual" | "outPrevious" | "outActual" | "result" | "observation";

export function Counters({
  data,
  user,
  balance,
  onBack,
  updateReading,
}: {
  data: AppData;
  user: User;
  balance: Balance;
  onBack?: () => void;
  updateReading: (id: string, patch: Partial<Reading>) => void;
}) {
  const readings = data.readings.filter((reading) => reading.balanceId === balance.id);
  const [drafts, setDrafts] = useState<Record<string, { status: ReadingStatus; inActual: string; outActual: string; observation: string }>>({});
  const [savedMessage, setSavedMessage] = useState("");
  const [sort, setSort] = useState<SortState<CounterSortKey>>({ key: "visibleId", direction: "asc" });

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        readings.map((reading) => [
          reading.id,
          {
            status: reading.status,
            inActual: counter(reading.inActual ?? reading.inPrevious),
            outActual: counter(reading.outActual ?? reading.outPrevious),
            observation: reading.observation,
          },
        ]),
      ),
    );
  }, [balance.id, readings.length]);

  const updateDraft = (readingId: string, patch: Partial<{ status: ReadingStatus; inActual: string; outActual: string; observation: string }>) => {
    setDrafts((current) => ({
      ...current,
      [readingId]: {
        ...(current[readingId] ?? { status: "PENDIENTE", inActual: "0", outActual: "0", observation: "" }),
        ...patch,
      },
    }));
    setSavedMessage("");
  };

  const invalidReadingIds = new Set(
    readings
      .filter((reading) => {
        const draft = drafts[reading.id];
        if (!draft) return false;
        return parseCounter(draft.inActual) < reading.inPrevious || parseCounter(draft.outActual) < reading.outPrevious;
      })
      .map((reading) => reading.id),
  );

  const saveDrafts = () => {
    const invalid = readings.find((reading) => invalidReadingIds.has(reading.id));
    if (invalid) {
      const machine = data.machines.find((item) => item.id === invalid.machineId);
      setSavedMessage(`Revisar ${machine?.name ?? "maquina"}: IN/OUT actual no puede ser menor al anterior. Fila marcada en rojo.`);
      return;
    }
    readings.forEach((reading) => {
      const draft = drafts[reading.id];
      if (!draft) return;
      updateReading(reading.id, {
        status: draft.status,
        inActual: parseCounter(draft.inActual),
        outActual: parseCounter(draft.outActual),
        observation: draft.observation,
      });
    });
    setSavedMessage("Contadores guardados.");
  };

  const draftSummary = readings.reduce(
    (summary, reading) => {
      const draft = drafts[reading.id];
      const inActual = draft ? parseCounter(draft.inActual) : reading.inActual ?? reading.inPrevious;
      const outActual = draft ? parseCounter(draft.outActual) : reading.outActual ?? reading.outPrevious;
      const totalIn = Math.max(0, inActual - reading.inPrevious);
      const totalOut = Math.max(0, outActual - reading.outPrevious);
      return {
        totalIn: summary.totalIn + totalIn,
        totalOut: summary.totalOut + totalOut,
        resultMachines: summary.resultMachines + totalIn - totalOut,
      };
    },
    { totalIn: 0, totalOut: 0, resultMachines: 0 },
  );
  const pendingCount = readings.filter((reading) => (drafts[reading.id]?.status ?? reading.status) === "PENDIENTE").length;
  const resultTone = draftSummary.resultMachines >= 0 ? "green" : "red";
  const counterSortValue = (reading: Reading, key: CounterSortKey): string | number => {
    const machine = data.machines.find((item) => item.id === reading.machineId);
    const draft = drafts[reading.id] ?? {
      status: reading.status,
      inActual: counter(reading.inActual ?? reading.inPrevious),
      outActual: counter(reading.outActual ?? reading.outPrevious),
      observation: reading.observation,
    };
    const inActual = parseCounter(draft.inActual);
    const outActual = parseCounter(draft.outActual);
    if (key === "visibleId") return machine?.visibleId ?? "";
    if (key === "machine") return machine?.name ?? "";
    if (key === "status") return draft.status;
    if (key === "inPrevious") return reading.inPrevious;
    if (key === "inActual") return inActual;
    if (key === "outPrevious") return reading.outPrevious;
    if (key === "outActual") return outActual;
    if (key === "result") return inActual - reading.inPrevious - (outActual - reading.outPrevious);
    return draft.observation;
  };
  const sortedReadings = [...readings].sort((left, right) => {
    const result = compareValues(counterSortValue(left, sort.key), counterSortValue(right, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const counterColumns: { key: CounterSortKey; label: string }[] = [
    { key: "visibleId", label: "ID" },
    { key: "machine", label: "Maquina" },
    { key: "status", label: "Estado" },
    { key: "inPrevious", label: "IN ant." },
    { key: "inActual", label: "IN act." },
    { key: "outPrevious", label: "OUT ant." },
    { key: "outActual", label: "OUT act." },
    { key: "result", label: "Resultado" },
    { key: "observation", label: "Obs." },
  ];

  return (
    <section className="counters-page">
      <div className="section-toolbar">
        <div>
          <h2>Cargar contadores</h2>
          <p>Entrada y salida total calculada con los valores actuales antes de guardar.</p>
        </div>
        {onBack && (
          <button className="button muted" type="button" onClick={onBack}>
            Volver al panel
          </button>
        )}
      </div>
      <div className="counter-overview">
        <div>
          <span>Maquinas a recaudar</span>
          <strong>{readings.length}</strong>
        </div>
        <div>
          <span>Pendientes de recaudar</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>
      <div className="card-grid three">
        <InfoCard tone="blue" title="Entrada total" lines={[`Total IN: ${money(draftSummary.totalIn)}`]} />
        <InfoCard tone="red" title="Salida total" lines={[`Total OUT: ${money(draftSummary.totalOut)}`]} />
        <InfoCard tone={resultTone} title="Resultado" lines={[`IN - OUT: ${money(draftSummary.resultMachines)}`]} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {counterColumns.map((column) => (
                <th key={column.key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                    {column.label}
                    {sortIndicator(sort, column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedReadings.map((reading) => {
              const machine = data.machines.find((item) => item.id === reading.machineId);
              const draft = drafts[reading.id] ?? {
                status: reading.status,
                inActual: counter(reading.inActual ?? reading.inPrevious),
                outActual: counter(reading.outActual ?? reading.outPrevious),
                observation: reading.observation,
              };
              const rowIn = parseCounter(draft.inActual) - reading.inPrevious;
              const rowOut = parseCounter(draft.outActual) - reading.outPrevious;
              const invalidIn = parseCounter(draft.inActual) < reading.inPrevious;
              const invalidOut = parseCounter(draft.outActual) < reading.outPrevious;
              const draftResult = rowIn - rowOut;
              return (
                <tr key={reading.id} className={invalidReadingIds.has(reading.id) ? "status-error" : undefined}>
                  <td>{machine?.visibleId}</td>
                  <td>{machine?.name}</td>
                  <td>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(reading.id, { status: event.target.value as ReadingStatus })}
                      disabled={balance.status !== "EN_PROCESO"}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="CARGADA">Cargada</option>
                      <option value="SIN_LECTURA">Sin lectura</option>
                      <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                    </select>
                  </td>
                  <td>{counter(reading.inPrevious)}</td>
                  <td>
                    <input
                      className={invalidIn ? "input-error" : undefined}
                      value={draft.inActual}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { inActual: formatCounterInput(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{counter(reading.outPrevious)}</td>
                  <td>
                    <input
                      className={invalidOut ? "input-error" : undefined}
                      value={draft.outActual}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { outActual: formatCounterInput(event.target.value), status: "CARGADA" })}
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                  <td>{money(draftResult)}</td>
                  <td>
                    <input
                      value={draft.observation}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateDraft(reading.id, { observation: event.target.value })}
                      placeholder="Tecnico / motivo"
                      disabled={balance.status !== "EN_PROCESO"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="button-row end counters-save-row">
        {savedMessage && <span className={savedMessage.startsWith("Revisar") ? "save-feedback error" : "save-feedback"}>{savedMessage}</span>}
        <button className="button success" type="button" disabled={balance.status !== "EN_PROCESO"} onClick={saveDrafts}>
          Guardar contadores
        </button>
      </div>
      <p className="helper">Los cambios se aplican al guardar. Usuario actual: {user.name}.</p>
    </section>
  );
}

