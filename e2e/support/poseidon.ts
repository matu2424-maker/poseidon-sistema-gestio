import { expect, type Page } from "@playwright/test";

export const STORAGE_KEY = "poseidon-sistema-gestion-v2";

export async function resetPoseidon(page: Page) {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    localStorage.removeItem(storageKey);
    sessionStorage.clear();
  }, STORAGE_KEY);
  await page.reload();
}

export async function loginPoseidon(page: Page, userId: string) {
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByLabel("Entrar como").selectOption(userId);
  await page.locator("form").getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

export async function storedSnapshot<T = unknown>(page: Page): Promise<T> {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) throw new Error("Poseidon no escribio el snapshot esperado.");
    return JSON.parse(raw) as T;
  }, STORAGE_KEY);
}
