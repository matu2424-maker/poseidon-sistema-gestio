import type { AppData, Balance, Local, Role, Screen, User } from "../../types";
import { AdminDashboard } from "./AdminDashboard";
import { CashierDashboard } from "./CashierDashboard";
import { ManagerDashboard } from "./ManagerDashboard";

export type RoleDashboardProps = {
  data: AppData;
  user: User;
  local: Local;
  openBalance: Balance | undefined;
  effectiveRole: Role;
  modeStatus: string;
  setScreen: (screen: Screen) => void;
  resetDemo: () => void;
};

export function Panel({
  data,
  local,
  openBalance,
  effectiveRole,
  modeStatus,
  setScreen,
  resetDemo,
}: RoleDashboardProps) {
  if (effectiveRole === "ADMINISTRADOR") {
    return <AdminDashboard data={data} setScreen={setScreen} resetDemo={resetDemo} />;
  }

  if (effectiveRole === "ENCARGADO") {
    return <ManagerDashboard data={data} local={local} setScreen={setScreen} />;
  }

  return (
    <CashierDashboard
      data={data}
      local={local}
      openBalance={openBalance}
      modeStatus={modeStatus}
      setScreen={setScreen}
    />
  );
}
