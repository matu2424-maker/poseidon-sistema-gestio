import type { Client, ClientDocumentType } from "../types";

export const sanitizeDigits = (value: string, maxLength = 20) => value.replace(/\D/g, "").slice(0, maxLength);

export const normalizeClientDocumentType = (value: unknown): ClientDocumentType => (String(value).toUpperCase() === "PASAPORTE" ? "PASAPORTE" : "CEDULA");

const sanitizePassport = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

export const normalizeClientDocument = (type: ClientDocumentType, value: string) => (type === "CEDULA" ? sanitizeDigits(value, 12) : sanitizePassport(value));

export const clientDocumentTypeLabel = (type: ClientDocumentType) => (type === "PASAPORTE" ? "Pasaporte" : "Cedula");

export const clientDocumentKey = (type: ClientDocumentType, documentId: string) => `${type}:${normalizeClientDocument(type, documentId)}`;

export const clientDocumentLabel = (client: Pick<Client, "documentType" | "documentId">) => {
  const documentType = normalizeClientDocumentType(client.documentType);
  const documentId = normalizeClientDocument(documentType, client.documentId ?? "");
  return documentId ? `${clientDocumentTypeLabel(documentType)} ${documentId}` : "Sin documento";
};

export const clientDocumentSearchText = (client: Pick<Client, "documentType" | "documentId">) =>
  [clientDocumentTypeLabel(normalizeClientDocumentType(client.documentType)), client.documentId ?? ""].join(" ");

export const hasClientDocumentDuplicate = (clients: Client[], documentType: ClientDocumentType, documentId: string, excludeId?: string) => {
  const key = clientDocumentKey(documentType, documentId);
  return clients.some(
    (client) => client.id !== excludeId && client.status !== "PAPELERA" && clientDocumentKey(normalizeClientDocumentType(client.documentType), client.documentId ?? "") === key,
  );
};
