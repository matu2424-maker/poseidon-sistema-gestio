import type { SalaryHistory, SalaryType, StaffMember } from "../types";
import { nowIso } from "./dates";
import { uid } from "./ids";

export const staffFullName = (staff: Pick<StaffMember, "firstName" | "lastName">) => `${staff.firstName} ${staff.lastName}`.trim();

export function salaryHistoryEvent(
  staff: StaffMember,
  previousSalaryType: SalaryType,
  previousNominalSalary: number,
  newSalaryType: SalaryType,
  newNominalSalary: number,
  effectiveDate: string,
  reason: string,
  userId: string,
  userName: string,
): SalaryHistory {
  return {
    id: uid("salary-history"),
    staffId: staff.id,
    staffName: staffFullName(staff),
    localId: staff.localId,
    previousSalaryType,
    newSalaryType,
    previousNominalSalary,
    newNominalSalary,
    effectiveDate,
    reason,
    userId,
    userName,
    createdAt: nowIso(),
  };
}
