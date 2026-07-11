import { clientDocumentLabel } from "../../lib/clients";
import type { Client, ClientStatus } from "../../types";

export type ClientTableColumn = "visibleId" | "name" | "document" | "category" | "phone" | "email" | "status";

export const clientStatusClass = (status: ClientStatus) =>
  status === "ACTIVO" ? "status-active" : status === "PAPELERA" ? "status-disused" : "status-inactive";

export const clientSortValue = (client: Client, key: ClientTableColumn): string | number => {
  if (key === "visibleId") return client.visibleId;
  if (key === "name") return client.name;
  if (key === "document") return clientDocumentLabel(client);
  if (key === "category") return client.category;
  if (key === "phone") return client.phone || "";
  if (key === "email") return client.email || "";
  return client.status;
};
