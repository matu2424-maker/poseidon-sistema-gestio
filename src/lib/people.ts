import type { StaffMember } from "../types";

export const staffFullName = (staff: Pick<StaffMember, "firstName" | "lastName">) => `${staff.firstName} ${staff.lastName}`.trim();
