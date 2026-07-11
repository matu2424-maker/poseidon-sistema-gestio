import { describe, expect, it } from "vitest";
import { createAsyncOperationQueue } from "./asyncOperationQueue";

describe("cola asincrona de persistencia", () => {
  it("conserva el orden de escrituras aunque la primera sea mas lenta", async () => {
    const queue = createAsyncOperationQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.run(async () => {
      events.push("primera-inicio");
      await firstGate;
      events.push("primera-fin");
    });
    const second = queue.run(async () => {
      events.push("segunda");
    });
    await Promise.resolve();
    expect(events).toEqual(["primera-inicio"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["primera-inicio", "primera-fin", "segunda"]);
  });

  it("continua con la siguiente operacion despues de un fallo", async () => {
    const queue = createAsyncOperationQueue();
    await expect(
      queue.run(async () => {
        throw new Error("fallo esperado");
      }),
    ).rejects.toThrow("fallo esperado");
    await expect(queue.run(async () => "guardado")).resolves.toBe("guardado");
  });
});
