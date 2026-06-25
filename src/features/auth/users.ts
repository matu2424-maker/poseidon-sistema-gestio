export type UserRole = "cajero" | "encargado" | "administrador";

export type MockUser = {
  id: string;
  name: string;
  role: UserRole;
  password: string;
};

export const mockUsers: MockUser[] = [
  {
    id: "cajero",
    name: "Cajero",
    role: "cajero",
    password: "cajero123",
  },
  {
    id: "encargado",
    name: "Encargado",
    role: "encargado",
    password: "encargado123",
  },
  {
    id: "administrador",
    name: "Administrador",
    role: "administrador",
    password: "admin123",
  },
];

export const roleLabels: Record<UserRole, string> = {
  cajero: "Cajero",
  encargado: "Encargado",
  administrador: "Administrador",
};
