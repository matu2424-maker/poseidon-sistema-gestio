import { lazy } from "react";

export const CloseCash = lazy(() =>
  import("../features/cashier/CloseCash").then(({ CloseCash }) => ({ default: CloseCash })),
);
export const Counters = lazy(() =>
  import("../features/cashier/Counters").then(({ Counters }) => ({ default: Counters })),
);
export const OpenCash = lazy(() =>
  import("../features/cashier/OpenCash").then(({ OpenCash }) => ({ default: OpenCash })),
);
export const Expenses = lazy(() =>
  import("../features/cashier/Movements").then(({ Expenses }) => ({ default: Expenses })),
);
export const Transfers = lazy(() =>
  import("../features/cashier/Movements").then(({ Transfers }) => ({ default: Transfers })),
);
export const Gifts = lazy(() =>
  import("../features/cashier/Movements").then(({ Gifts }) => ({ default: Gifts })),
);
export const CapitalMovements = lazy(() =>
  import("../features/cashier/Movements").then(({ CapitalMovements }) => ({ default: CapitalMovements })),
);
export const CashierSalaryPayments = lazy(() =>
  import("../features/cashier/CashierSalaryPayments").then(({ CashierSalaryPayments }) => ({ default: CashierSalaryPayments })),
);
export const CashierClients = lazy(() =>
  import("../features/cashier/CashierClients").then(({ CashierClients }) => ({ default: CashierClients })),
);
export const AdminCurrentAccounts = lazy(() =>
  import("../features/accounts/CurrentAccounts").then(({ AdminCurrentAccounts }) => ({ default: AdminCurrentAccounts })),
);
export const Panel = lazy(() =>
  import("../features/dashboard/RoleDashboard").then(({ Panel }) => ({ default: Panel })),
);
export const Differences = lazy(() =>
  import("../features/manager/Differences").then(({ Differences }) => ({ default: Differences })),
);
export const ManagerExpenses = lazy(() =>
  import("../features/manager/Expenses").then(({ ManagerExpenses }) => ({ default: ManagerExpenses })),
);
export const AdminSalarySettlements = lazy(() =>
  import("../features/salaries/SalarySettlements").then(({ AdminSalarySettlements }) => ({ default: AdminSalarySettlements })),
);
export const AdminClients = lazy(() =>
  import("../features/admin/Clients").then(({ AdminClients }) => ({ default: AdminClients })),
);
export const AdminLocals = lazy(() =>
  import("../features/admin/LocationsMachines").then(({ AdminLocals }) => ({ default: AdminLocals })),
);
export const AdminMachines = lazy(() =>
  import("../features/admin/LocationsMachines").then(({ AdminMachines }) => ({ default: AdminMachines })),
);
export const AdminStaff = lazy(() =>
  import("../features/admin/Staff").then(({ AdminStaff }) => ({ default: AdminStaff })),
);
export const AdminTrash = lazy(() =>
  import("../features/admin/Staff").then(({ AdminTrash }) => ({ default: AdminTrash })),
);
export const AdminExpenseCategories = lazy(() =>
  import("../features/admin/Settings").then(({ AdminExpenseCategories }) => ({ default: AdminExpenseCategories })),
);
export const AdminUsers = lazy(() =>
  import("../features/admin/Settings").then(({ AdminUsers }) => ({ default: AdminUsers })),
);
export const Audit = lazy(() =>
  import("../features/audit/Audit").then(({ Audit }) => ({ default: Audit })),
);
export const Periodic = lazy(() =>
  import("../features/reports/Periodic").then(({ Periodic }) => ({ default: Periodic })),
);
export const Reports = lazy(() =>
  import("../features/reports/Reports").then(({ Reports }) => ({ default: Reports })),
);
export const LocalDataMaintenance = lazy(() =>
  import("../features/system/LocalDataMaintenance").then(({ LocalDataMaintenance }) => ({ default: LocalDataMaintenance })),
);
