import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "../types";
import type { AppDataRepository } from "../application/ports/AppDataRepository";
import { createAsyncOperationQueue } from "../application/ports/asyncOperationQueue";
import { createSeedData, normalizeData } from "../data/appData";

export type StorageIssue = { raw: string; error: string };

export function useAppDataRepository(
  repository: AppDataRepository,
  setMessage: (message: string) => void,
) {
  const [data, setData] = useState<AppData>(() => createSeedData());
  const [storageIssue, setStorageIssue] = useState<StorageIssue>();
  const [storageReady, setStorageReady] = useState(false);
  const operationQueue = useRef(createAsyncOperationQueue());

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => operationQueue.current.run(operation), []);

  const persistNow = useCallback(
    (nextData: AppData) => enqueue(() => repository.save(nextData)),
    [enqueue, repository],
  );

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const stored = await repository.load();
        if (!active) return;
        if (stored.status === "empty") {
          setData(createSeedData());
        } else if (stored.status === "corrupt") {
          setStorageIssue({ raw: stored.raw, error: stored.error });
        } else {
          try {
            setData(normalizeData(stored.data));
            if (stored.needsRewrite) setMessage("Los datos locales se actualizaron al formato versionado.");
          } catch (error) {
            setStorageIssue({
              raw: stored.raw,
              error: error instanceof Error ? error.message : "No se pudo normalizar el almacenamiento local.",
            });
          }
        }
      } catch (error) {
        if (!active) return;
        setStorageIssue({
          raw: "",
          error: error instanceof Error ? error.message : "No se pudo leer el repositorio de datos.",
        });
      } finally {
        if (active) setStorageReady(true);
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [repository, setMessage]);

  useEffect(() => {
    if (!storageReady || storageIssue) return;
    void persistNow(data)
      .then((result) => {
        if (result.status === "failed") {
          setMessage("No se pudo guardar localmente. Exporta un respaldo antes de continuar cargando datos.");
        }
      })
      .catch(() => {
        setMessage("No se pudo guardar localmente. Exporta un respaldo antes de continuar cargando datos.");
      });
  }, [data, persistNow, setMessage, storageIssue, storageReady]);

  const startFresh = useCallback(async () => {
    await enqueue(() => repository.clear());
    setData(createSeedData());
    setStorageIssue(undefined);
    setStorageReady(true);
    setMessage("Se inicio un almacenamiento local nuevo.");
  }, [enqueue, repository, setMessage]);

  return {
    data,
    setData,
    storageIssue,
    storageReady,
    persistNow,
    startFresh,
  };
}
