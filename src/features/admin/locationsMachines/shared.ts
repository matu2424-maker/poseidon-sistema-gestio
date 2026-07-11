import type { AppData, AuditEvent, Local, LocalImage, MachineStatus } from "../../../types";
import { uid } from "../../../lib/ids";
export { confirmAction } from "../../../lib/confirmations";
export { POSEIDON_LOCAL_ID, WORKSHOP_LABEL, WORKSHOP_LOCAL_ID } from "../../../data/appDataIds";

export const sanitizeNumberId = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export const localStatusClass = (status: Local["status"]) =>
  status === "ACTIVO" ? "status-active" : status === "CERRADO" ? "status-closed" : "status-inactive";

export const machineStatusClass = (status: MachineStatus) =>
  status === "ACTIVA" ? "status-active" : status === "MANTENIMIENTO" ? "status-maintenance" : status === "DESUSO" ? "status-disused" : "status-inactive";

export const localOptionName = (local: Local) => `${local.id} - ${local.name}`;

export const mapsHref = (local: Local) =>
  local.googleMapsUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.address || local.name)}`;

export const auditUserName = (data: AppData, event: AuditEvent) =>
  event.userName || data.users.find((user) => user.id === event.userId)?.name || "Sistema";

export const parseAuditValue = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export function readLocalImages(files: FileList): Promise<LocalImage[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<LocalImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: uid("local-image"),
              name: file.name,
              dataUrl: String(reader.result ?? ""),
              createdAt: new Date().toISOString(),
            });
          reader.onerror = () =>
            resolve({ id: uid("local-image"), name: file.name, dataUrl: "", createdAt: new Date().toISOString() });
          reader.readAsDataURL(file);
        }),
    ),
  );
}
