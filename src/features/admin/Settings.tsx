import { useEffect, useState, type FormEvent } from "react";
import type { AppData, ExpenseCategory, Role, User } from "../../types";
import { localName, roleLabels } from "../../lib/display";
import { uid } from "../../lib/ids";
import { readColumnPreference, writeColumnPreference } from "../../lib/storage";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { ColumnChooser, type TableColumn } from "../../components/ui";
import { confirmAction } from "../../lib/confirmations";

const POSEIDON_LOCAL_ID = "1";
type UserColumnKey = "name" | "username" | "role" | "status" | "locals" | "actions";
const USER_COLUMNS_STORAGE_KEY = "poseidon-usuarios-columnas-v1";
const userColumns: TableColumn<UserColumnKey>[] = [
  { key: "name", label: "Usuario", sortable: true },
  { key: "username", label: "Login", sortable: true },
  { key: "role", label: "Rol", sortable: true },
  { key: "status", label: "Estado", sortable: true },
  { key: "locals", label: "Locales", sortable: true },
  { key: "actions", label: "Acciones" },
];
const fixedUserColumns: UserColumnKey[] = ["name", "username", "role", "status", "actions"];
export function AdminUsers({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [visibleColumns, setVisibleColumns] = useState<UserColumnKey[]>(() => readColumnPreference(USER_COLUMNS_STORAGE_KEY, userColumns, fixedUserColumns));
  const [sort, setSort] = useState<SortState<UserColumnKey>>({ key: "name", direction: "asc" });
  useEffect(() => {
    writeColumnPreference(USER_COLUMNS_STORAGE_KEY, visibleColumns);
  }, [visibleColumns]);
  const toggleColumn = (key: UserColumnKey) => {
    setVisibleColumns((current) => {
      if (fixedUserColumns.includes(key)) return current;
      return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    });
  };
  const userSortValue = (item: User, key: UserColumnKey): string | number => {
    if (key === "role") return roleLabels[item.role];
    if (key === "locals") return item.localIds.length;
    if (key === "actions") return "";
    return item[key] ?? "";
  };
  const sortedUsers = [...data.users].sort((a, b) => {
    const result = compareValues(userSortValue(a, sort.key), userSortValue(b, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const visibleUserColumns = userColumns.filter((column) => visibleColumns.includes(column.key));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user: User = {
      id: uid("user"),
      name: String(form.get("name")),
      username: String(form.get("username")),
      password: String(form.get("password") || "poseidon123"),
      role: String(form.get("role")) as Role,
      status: "ACTIVO",
      localIds: [POSEIDON_LOCAL_ID],
    };
    if (!user.name.trim() || !user.username.trim()) return;
    if (!confirmAction(`Confirmar creacion del usuario ${user.name}?`)) return;
    patchData((current) => audit({ ...current, users: [...current.users, user] }, "Crear usuario", "Usuario", user.id, "", user));
    event.currentTarget.reset();
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">Alta rapida y vista configurable de usuarios del sistema.</p>
        </div>
        <div className="admin-header-actions">
          <span>{data.users.length} usuarios</span>
        </div>
      </div>
      <div className="admin-layout users-admin-layout">
        <section className="form-card compact-form">
          <h2>Crear usuario</h2>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Nombre
              <input name="name" required />
            </label>
            <label>
              Login
              <input name="username" required />
            </label>
            <label>
              Contrasena
              <input name="password" placeholder="poseidon123" />
            </label>
            <label>
              Rol
              <select name="role">
                <option value="CAJERO">Cajero</option>
                <option value="ENCARGADO">Encargado</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </label>
            <button className="button success compact" type="submit">
              Guardar
            </button>
          </form>
        </section>
        <section className="table-panel">
          <ColumnChooser label="Columnas" columns={userColumns} visible={visibleColumns} fixed={fixedUserColumns} onToggle={toggleColumn} />
          <div className="table-wrap grow">
            <table className="data-table admin-data-table user-data-table">
              <thead>
                <tr>
                  {visibleUserColumns.map((column) => (
                    <th key={column.key} aria-sort={column.sortable ? ariaSort(sort, column.key) : undefined}>
                      {column.sortable ? (
                        <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, column.key))}>
                          {column.label}
                          {sortIndicator(sort, column.key)}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((item) => (
                  <tr key={item.id} className={item.status === "ACTIVO" ? "status-active" : "status-inactive"}>
                    {visibleColumns.includes("name") && <td>{item.name}</td>}
                    {visibleColumns.includes("username") && <td>{item.username}</td>}
                    {visibleColumns.includes("role") && <td>{roleLabels[item.role]}</td>}
                    {visibleColumns.includes("status") && <td>{item.status}</td>}
                    {visibleColumns.includes("locals") && <td>{item.localIds.map((localId) => localName(data, localId)).join(", ")}</td>}
                    {visibleColumns.includes("actions") && <td className="muted-cell">Edicion futura</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export function AdminExpenseCategories({
  data,
  patchData,
  audit,
}: {
  data: AppData;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, string>>({});

  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    const category: ExpenseCategory = { id: uid("expense-cat"), name, subcategories: [], status: "ACTIVA" };
    patchData((current) =>
      audit({ ...current, expenseCategories: [...current.expenseCategories, category] }, "Crear categoria gasto", "CategoriaGasto", category.id, "", category),
    );
    setCategoryName("");
  };

  const addSubcategory = (category: ExpenseCategory) => {
    const name = (subcategoryDrafts[category.id] ?? "").trim();
    if (!name || category.subcategories.includes(name)) return;
    patchData((current) => {
      const previous = current.expenseCategories.find((item) => item.id === category.id);
      const expenseCategories = current.expenseCategories.map((item) =>
        item.id === category.id ? { ...item, subcategories: [...item.subcategories, name] } : item,
      );
      return audit({ ...current, expenseCategories }, "Crear subcategoria gasto", "CategoriaGasto", category.id, previous, { subcategory: name });
    });
    setSubcategoryDrafts((current) => ({ ...current, [category.id]: "" }));
  };

  const removeSubcategory = (category: ExpenseCategory, subcategory: string) => {
    if (!confirmAction(`Quitar subcategoria ${subcategory}?`)) return;
    patchData((current) => {
      const previous = current.expenseCategories.find((item) => item.id === category.id);
      const expenseCategories = current.expenseCategories.map((item) =>
        item.id === category.id ? { ...item, subcategories: item.subcategories.filter((name) => name !== subcategory) } : item,
      );
      return audit({ ...current, expenseCategories }, "Quitar subcategoria gasto", "CategoriaGasto", category.id, previous, { subcategory });
    });
  };

  const toggleCategory = (category: ExpenseCategory) => {
    patchData((current) => {
      const nextStatus: ExpenseCategory["status"] = category.status === "ACTIVA" ? "INACTIVA" : "ACTIVA";
      const expenseCategories = current.expenseCategories.map((item) => (item.id === category.id ? { ...item, status: nextStatus } : item));
      return audit({ ...current, expenseCategories }, "Cambiar estado categoria gasto", "CategoriaGasto", category.id, category, { status: nextStatus });
    });
  };

  const removeCategory = (category: ExpenseCategory) => {
    const used = data.expenses.some((expense) => expense.category === category.name);
    if (used) return;
    if (!confirmAction(`Quitar categoria ${category.name}?`)) return;
    patchData((current) =>
      audit(
        { ...current, expenseCategories: current.expenseCategories.filter((item) => item.id !== category.id) },
        "Quitar categoria gasto",
        "CategoriaGasto",
        category.id,
        category,
        "",
      ),
    );
  };

  return (
    <section className="admin-focus">
      <div className="admin-header">
        <div>
          <p className="helper">El cajero solo puede cargar gastos usando estas categorias y subcategorias.</p>
        </div>
        <span>{data.expenseCategories.length} categorias</span>
      </div>
      <form className="toolbar-row" onSubmit={addCategory}>
        <input className="search-input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Nueva categoria" />
        <button className="button success compact" type="submit">
          Agregar
        </button>
      </form>
      <div className="category-admin-grid">
        {data.expenseCategories.map((category) => {
          const used = data.expenses.some((expense) => expense.category === category.name);
          return (
            <article className="category-card" key={category.id}>
              <div className="admin-header">
                <div>
                  <h3>{category.name}</h3>
                  <p className="helper">{category.status}</p>
                </div>
                <div className="table-actions">
                  <button className="button muted compact" type="button" onClick={() => toggleCategory(category)}>
                    {category.status === "ACTIVA" ? "Inactivar" : "Activar"}
                  </button>
                  <button className="button danger compact" type="button" disabled={used} onClick={() => removeCategory(category)}>
                    Quitar
                  </button>
                </div>
              </div>
              <div className="tag-list">
                {category.subcategories.map((subcategory) => (
                  <span key={subcategory}>
                    {subcategory}
                    <button type="button" onClick={() => removeSubcategory(category, subcategory)}>
                      x
                    </button>
                  </span>
                ))}
                {!category.subcategories.length && <p className="helper">Sin subcategorias.</p>}
              </div>
              <div className="toolbar-row">
                <input
                  value={subcategoryDrafts[category.id] ?? ""}
                  onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [category.id]: event.target.value }))}
                  placeholder="Nueva subcategoria"
                />
                <button className="button primary compact" type="button" onClick={() => addSubcategory(category)}>
                  Agregar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

