import type { AppData, Balance, Local, Role, Screen } from "../../types";
import { AdminDashboard } from "./AdminDashboard";
import { ManagerDashboard } from "./ManagerDashboard";

export type RoleDashboardProps = {
  data: AppData;
  local: Local;
  openBalance: Balance | undefined;
  effectiveRole: Role;
  setScreen: (screen: Screen) => void;
};

export function Panel({
  data,
  local,
  openBalance,
  effectiveRole,
  setScreen,
}: RoleDashboardProps) {
  if (effectiveRole === "ADMINISTRADOR") {
    return <AdminDashboard data={data} setScreen={setScreen} />;
  }

  if (effectiveRole === "ENCARGADO") {
    return <ManagerDashboard data={data} local={local} openBalance={openBalance} setScreen={setScreen} />;
  }

  return null;
}
