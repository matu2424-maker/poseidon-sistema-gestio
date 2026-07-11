import type { MenuGroup, Role, Screen } from "../types";

type ScreenDefinition = {
  title: string | Partial<Record<Role, string>>;
  roles: Role[];
  requiresOpenCash?: boolean;
};

export const screenDefinitions: Record<Screen, ScreenDefinition> = {
  welcome: { title: "Poseidon", roles: [] },
  login: { title: "Ingreso al sistema", roles: [] },
  panel: {
    title: {
      ADMINISTRADOR: "Reportes y administracion",
      ENCARGADO: "Panel del encargado",
      CAJERO: "Panel del cajero",
    },
    roles: ["CAJERO", "ENCARGADO", "ADMINISTRADOR"],
  },
  "open-cash": { title: "Caja diaria", roles: ["CAJERO"] },
  counters: { title: "Cargar contadores", roles: ["CAJERO"], requiresOpenCash: true },
  expenses: { title: "Cargar gastos", roles: ["CAJERO"], requiresOpenCash: true },
  transfers: { title: "Cargar transferencias", roles: ["CAJERO"], requiresOpenCash: true },
  gifts: { title: "Cargar regalos", roles: ["CAJERO"], requiresOpenCash: true },
  "salary-payments": { title: "Pago de salarios", roles: ["CAJERO"], requiresOpenCash: true },
  "capital-movements": { title: "Retiros y aportes", roles: ["CAJERO"], requiresOpenCash: true },
  "cashier-clients": { title: "Clientes", roles: ["CAJERO"] },
  "cashier-summary": { title: "Resumen de cajas", roles: ["CAJERO", "ENCARGADO", "ADMINISTRADOR"] },
  "close-cash": { title: "Cerrar caja diaria", roles: ["CAJERO"], requiresOpenCash: true },
  reports: {
    title: { ADMINISTRADOR: "Reportes y administracion", ENCARGADO: "Reportes" },
    roles: ["ENCARGADO", "ADMINISTRADOR"],
  },
  "manager-expenses": { title: "Control de gastos", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-users": { title: "Usuarios", roles: ["ADMINISTRADOR"] },
  "admin-staff": { title: "Personal", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-salary-settlements": { title: "Liquidacion de salarios", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-clients": { title: "Clientes", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-current-accounts": { title: "Cuentas corrientes", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-trash": { title: "Papelera", roles: ["ADMINISTRADOR"] },
  "admin-expense-categories": { title: "Categorias de gastos", roles: ["ADMINISTRADOR"] },
  "admin-local-data": { title: "Datos locales", roles: ["ADMINISTRADOR"] },
  "admin-machines": { title: "Maquinas", roles: ["ADMINISTRADOR"] },
  workshop: { title: "Taller", roles: ["ADMINISTRADOR"] },
  "admin-locals": { title: "Locales", roles: ["ADMINISTRADOR"] },
  differences: { title: "Diferencias de caja", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  audit: { title: "Auditoria", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  periodic: { title: "Cierre periodico", roles: ["ENCARGADO", "ADMINISTRADOR"] },
};

const adminMenu: MenuGroup[] = [
  { title: "Inicio", items: [{ label: "Panel general", screen: "panel" }] },
  {
    title: "Control y auditoria",
    items: [
      { label: "Diferencias", screen: "differences" },
      { label: "Gastos", screen: "manager-expenses" },
      { label: "Auditoria", screen: "audit" },
      { label: "Cuentas corrientes", screen: "admin-current-accounts" },
    ],
  },
  {
    title: "Cierres y reportes",
    items: [
      { label: "Resumen de cajas", screen: "cashier-summary" },
      { label: "Reportes", screen: "reports" },
      { label: "Cierre periodico", screen: "periodic" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { label: "Locales", screen: "admin-locals" },
      { label: "Maquinas", screen: "admin-machines" },
      { label: "Taller", screen: "workshop" },
      { label: "Categorias gastos", screen: "admin-expense-categories" },
    ],
  },
  {
    title: "Personas",
    items: [
      { label: "Clientes", screen: "admin-clients" },
      { label: "Personal", screen: "admin-staff" },
      { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
      { label: "Usuarios", screen: "admin-users" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Datos locales", screen: "admin-local-data" },
      { label: "Papelera", screen: "admin-trash" },
    ],
  },
];

const managerMenu: MenuGroup[] = [
  { title: "Inicio", items: [{ label: "Panel encargado", screen: "panel" }] },
  {
    title: "Control y auditoria",
    items: [
      { label: "Diferencias", screen: "differences" },
      { label: "Gastos", screen: "manager-expenses" },
      { label: "Auditoria", screen: "audit" },
      { label: "Cuentas corrientes", screen: "admin-current-accounts" },
    ],
  },
  {
    title: "Cierres y reportes",
    items: [
      { label: "Resumen de cajas", screen: "cashier-summary" },
      { label: "Cierre periodico", screen: "periodic" },
      { label: "Reportes", screen: "reports" },
    ],
  },
  {
    title: "Personas",
    items: [
      { label: "Personal", screen: "admin-staff" },
      { label: "Liquidacion salarios", screen: "admin-salary-settlements" },
      { label: "Clientes", screen: "admin-clients" },
    ],
  },
];

const cashierMenu: MenuGroup[] = [
  {
    title: "Caja diaria",
    items: [
      { label: "Panel cajero", screen: "panel" },
      { label: "Caja diaria", screen: "open-cash" },
      { label: "Contadores", screen: "counters" },
      { label: "Gastos", screen: "expenses" },
      { label: "Transferencias", screen: "transfers" },
      { label: "Regalos", screen: "gifts" },
      { label: "Retiros / aportes", screen: "capital-movements" },
      { label: "Cerrar caja", screen: "close-cash" },
    ],
  },
];

export function menuGroupsForRole(role: Role): MenuGroup[] {
  if (role === "ADMINISTRADOR") return adminMenu;
  if (role === "ENCARGADO") return managerMenu;
  return cashierMenu;
}

export function titleForScreen(screen: Screen, role: Role): string {
  const title = screenDefinitions[screen].title;
  if (typeof title === "string") return title;
  return title[role] ?? Object.values(title)[0] ?? "Poseidon";
}

export function canAccessScreen(screen: Screen, role: Role): boolean {
  return screenDefinitions[screen].roles.includes(role);
}

export function screenRequiresOpenCash(screen: Screen): boolean {
  return screenDefinitions[screen].requiresOpenCash === true;
}
