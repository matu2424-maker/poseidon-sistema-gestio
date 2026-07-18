import type { MenuGroup, Role, Screen } from "../types";

type ScreenDefinition = {
  path: `/${string}` | "/";
  title: string | Partial<Record<Role, string>>;
  roles: Role[];
  requiresOpenCash?: boolean;
};

export const screenDefinitions: Record<Screen, ScreenDefinition> = {
  welcome: { path: "/", title: "Poseidon", roles: [] },
  login: { path: "/ingresar", title: "Ingreso al sistema", roles: [] },
  panel: {
    path: "/panel",
    title: {
      ADMINISTRADOR: "Reportes y administracion",
      ENCARGADO: "Panel del encargado",
      CAJERO: "Panel del cajero",
    },
    roles: ["CAJERO", "ENCARGADO", "ADMINISTRADOR"],
  },
  "open-cash": { path: "/caja/abrir", title: "Caja diaria", roles: ["CAJERO"] },
  counters: { path: "/caja/contadores", title: "Cargar contadores", roles: ["CAJERO"], requiresOpenCash: true },
  expenses: { path: "/caja/gastos", title: "Cargar gastos", roles: ["CAJERO"], requiresOpenCash: true },
  transfers: { path: "/caja/transferencias", title: "Cargar transferencias", roles: ["CAJERO"], requiresOpenCash: true },
  gifts: { path: "/caja/regalos", title: "Cargar regalos", roles: ["CAJERO"], requiresOpenCash: true },
  "salary-payments": { path: "/caja/salarios", title: "Pago de salarios", roles: ["CAJERO"], requiresOpenCash: true },
  "capital-movements": { path: "/caja/fondos", title: "Caja y Principal", roles: ["CAJERO"], requiresOpenCash: true },
  "cashier-clients": { path: "/caja/clientes", title: "Clientes", roles: ["CAJERO"] },
  "cashier-summary": { path: "/recaudaciones", title: "Resumen de cajas", roles: ["CAJERO", "ENCARGADO", "ADMINISTRADOR"] },
  "close-cash": { path: "/caja/cerrar", title: "Cerrar caja diaria", roles: ["CAJERO"], requiresOpenCash: true },
  reports: {
    path: "/reportes",
    title: { ADMINISTRADOR: "Reportes y administracion", ENCARGADO: "Reportes" },
    roles: ["ENCARGADO", "ADMINISTRADOR"],
  },
  "manager-expenses": { path: "/control/gastos", title: "Control de gastos", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-users": { path: "/administracion/usuarios", title: "Usuarios", roles: ["ADMINISTRADOR"] },
  "admin-staff": { path: "/personal", title: "Personal", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-salary-settlements": { path: "/liquidacion-salarios", title: "Liquidacion de salarios", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-clients": { path: "/clientes", title: "Clientes", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-current-accounts": { path: "/cuentas-corrientes", title: "Cuentas corrientes", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  "admin-trash": { path: "/administracion/papelera", title: "Papelera", roles: ["ADMINISTRADOR"] },
  "admin-expense-categories": { path: "/administracion/categorias-gastos", title: "Categorias de gastos", roles: ["ADMINISTRADOR"] },
  "admin-local-data": { path: "/administracion/datos-locales", title: "Datos locales", roles: ["ADMINISTRADOR"] },
  "admin-machines": { path: "/maquinas", title: "Maquinas", roles: ["ADMINISTRADOR"] },
  workshop: { path: "/taller", title: "Taller", roles: ["ADMINISTRADOR"] },
  "admin-locals": { path: "/locales", title: "Locales", roles: ["ADMINISTRADOR"] },
  differences: { path: "/diferencias", title: "Diferencias de caja", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  audit: { path: "/auditoria", title: "Auditoria", roles: ["ENCARGADO", "ADMINISTRADOR"] },
  periodic: { path: "/cierres-periodicos", title: "Cierre periodico", roles: ["ENCARGADO", "ADMINISTRADOR"] },
};

const screenByPath = new Map<string, Screen>(
  Object.entries(screenDefinitions).map(([screen, definition]) => [definition.path, screen as Screen]),
);

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "")}`;
};

export const pathForScreen = (screen: Screen) => screenDefinitions[screen].path;

export const screenForPath = (pathname: string): Screen | null => screenByPath.get(normalizePath(pathname)) ?? null;

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
      { label: "Control de gastos", screen: "manager-expenses" },
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

export function menuGroupsForRole(role: Role): MenuGroup[] {
  if (role === "ADMINISTRADOR") return adminMenu;
  if (role === "ENCARGADO") return managerMenu;
  return [];
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
