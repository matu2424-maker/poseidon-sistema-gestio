import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import type { AppData } from "../types";
import type { AppDataRepository } from "../application/ports/AppDataRepository";
import { createAsyncOperationQueue } from "../application/ports/asyncOperationQueue";
import { createSeedData } from "../data/appData";
import { hydrateAppData } from "../data/migrateData";

export type StorageIssue = {
  kind: "corrupt" | "conflict" | "write";
  raw: string;
  error: string;
  storedRaw?: string;
};

export function useAppDataRepository(
  repository: AppDataRepository,
  setMessage: (message: string) => void,
) {
  const [data, setDataState] = useState<AppData>(() => createSeedData());
  const [storageIssue, setStorageIssue] = useState<StorageIssue>();
  const [storageReady, setStorageReady] = useState(false);
  const operationQueue = useRef(createAsyncOperationQueue());
  const persistedRaw = useRef<string | null | undefined>(undefined);
  const skipNextPersistence = useRef(false);
  const localRevision = useRef(0);
  const persistedRevision = useRef(0);

  const setData = useCallback((action: SetStateAction<AppData>) => {
    setDataState((current) => {
      const nextData = typeof action === "function" ? (action as (value: AppData) => AppData)(current) : action;
      if (Object.is(nextData, current)) return current;
      localRevision.current += 1;
      return nextData;
    });
  }, []);

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => operationQueue.current.run(operation), []);

  const persistNow = useCallback(
    async (nextData: AppData, revision = localRevision.current) => {
      const result = await enqueue(() => repository.save(nextData, persistedRaw.current));
      if (result.status === "ok") {
        persistedRaw.current = result.raw;
        persistedRevision.current = Math.max(persistedRevision.current, revision);
      } else if (result.status === "conflict") {
        setStorageIssue({
          kind: "conflict",
          raw: result.attemptedRaw,
          storedRaw: result.storedRaw,
          error: result.error,
        });
      } else {
        setStorageIssue({ kind: "write", raw: result.attemptedRaw, error: result.error });
      }
      return result;
    },
    [enqueue, repository],
  );

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const stored = await repository.load();
        if (!active) return;
        if (stored.status === "empty") {
          persistedRaw.current = null;
          setDataState(createSeedData());
        } else if (stored.status === "corrupt") {
          persistedRaw.current = undefined;
          setStorageIssue({ kind: "corrupt", raw: stored.raw, error: stored.error });
        } else {
          try {
            persistedRaw.current = stored.raw;
            skipNextPersistence.current = !stored.needsRewrite;
            setDataState(hydrateAppData(stored.data, stored.sourceVersion));
            if (stored.needsRewrite) setMessage("Los datos locales se actualizaron al formato versionado.");
          } catch (error) {
            setStorageIssue({
              kind: "corrupt",
              raw: stored.raw,
              error: error instanceof Error ? error.message : "No se pudo normalizar el almacenamiento local.",
            });
          }
        }
      } catch (error) {
        if (!active) return;
        setStorageIssue({
          kind: "corrupt",
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
    if (skipNextPersistence.current) {
      skipNextPersistence.current = false;
      return;
    }
    const revision = localRevision.current;
    void persistNow(data, revision).catch((error) => {
      setStorageIssue({
        kind: "write",
        raw: "",
        error: error instanceof Error ? error.message : "No se pudo guardar localmente.",
      });
    });
  }, [data, persistNow, storageIssue, storageReady]);

  useEffect(() => {
    if (!storageReady || storageIssue || !repository.subscribe) return;
    let active = true;
    const unsubscribe = repository.subscribe(() => {
      const revision = localRevision.current;
      if (revision !== persistedRevision.current) return;
      void enqueue(async () => {
        const stored = await repository.load();
        if (!active || localRevision.current !== revision || persistedRevision.current !== revision) return;
        if (stored.status === "corrupt") {
          persistedRaw.current = undefined;
          setStorageIssue({ kind: "corrupt", raw: stored.raw, error: stored.error });
          return;
        }
        if (stored.status === "empty") {
          persistedRaw.current = null;
          skipNextPersistence.current = true;
          setDataState(createSeedData());
          return;
        }
        try {
          persistedRaw.current = stored.raw;
          skipNextPersistence.current = !stored.needsRewrite;
          setDataState(hydrateAppData(stored.data, stored.sourceVersion));
        } catch (error) {
          setStorageIssue({
            kind: "corrupt",
            raw: stored.raw,
            error: error instanceof Error ? error.message : "No se pudo normalizar el almacenamiento local.",
          });
        }
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [enqueue, repository, storageIssue, storageReady]);

  const reloadStored = useCallback(async () => {
    const stored = await enqueue(() => repository.load());
    if (stored.status === "corrupt") {
      persistedRaw.current = undefined;
      setStorageIssue({ kind: "corrupt", raw: stored.raw, error: stored.error });
      return false;
    }
    if (stored.status === "empty") {
      persistedRaw.current = null;
      skipNextPersistence.current = false;
      localRevision.current += 1;
      persistedRevision.current = localRevision.current;
      setDataState(createSeedData());
    } else {
      try {
        persistedRaw.current = stored.raw;
        skipNextPersistence.current = true;
        localRevision.current += 1;
        persistedRevision.current = localRevision.current;
        setDataState(hydrateAppData(stored.data, stored.sourceVersion));
      } catch (error) {
        setStorageIssue({
          kind: "corrupt",
          raw: stored.raw,
          error: error instanceof Error ? error.message : "No se pudo normalizar el almacenamiento local.",
        });
        return false;
      }
    }
    setStorageIssue(undefined);
    setStorageReady(true);
    setMessage("Se cargo la ultima version guardada localmente.");
    return true;
  }, [enqueue, repository, setMessage]);

  const retryPendingSave = useCallback(async () => {
    const result = await persistNow(data, localRevision.current);
    if (result.status !== "ok") return false;
    skipNextPersistence.current = true;
    setStorageIssue(undefined);
    setMessage("Los datos pendientes se guardaron correctamente.");
    return true;
  }, [data, persistNow, setMessage]);

  const startFresh = useCallback(async () => {
    await enqueue(() => repository.clear());
    persistedRaw.current = null;
    skipNextPersistence.current = false;
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
    reloadStored,
    retryPendingSave,
    startFresh,
  };
}
