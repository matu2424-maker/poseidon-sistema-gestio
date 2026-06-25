import { BarChart3, Boxes, ClipboardList, Home, Receipt, Settings, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "../auth/users";

export type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const menuItems: MenuItem[] = [
  {
    id: "inicio",
    label: "Inicio",
    icon: Home,
    roles: ["cajero", "encargado", "administrador"],
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: Receipt,
    roles: ["cajero", "encargado", "administrador"],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Boxes,
    roles: ["encargado", "administrador"],
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: BarChart3,
    roles: ["encargado", "administrador"],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["administrador"],
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icon: ClipboardList,
    roles: ["administrador"],
  },
  {
    id: "permisos",
    label: "Permisos",
    icon: ShieldCheck,
    roles: ["administrador"],
  },
  {
    id: "configuracion",
    label: "Configuracion",
    icon: Settings,
    roles: ["administrador"],
  },
];

export function getMenuForRole(role: UserRole) {
  return menuItems.filter((item) => item.roles.includes(role));
}
