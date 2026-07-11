import { useState, type FormEvent } from "react";
import type {
  AppData,
  Balance,
  CapitalMovement,
  CapitalMovementMedium,
  CapitalMovementPerson,
  CapitalMovementType,
  Client,
  Expense,
  Gift,
  MovementStatus,
  Transfer,
  User,
} from "../../types";
import {
  capitalAccountMovement,
  localExpenseAccountMovement,
  localGiftAccountMovement,
  localTransferAccountMovement,
  transferAccountMovement,
  reverseSourceAccountMovements,
  upsertAccountMovement,
} from "../../lib/accountMovements";
import { createTransferCurrentAccount, ensureLocalCurrentAccounts, TRANSFER_ACCOUNT_ID } from "../../lib/currentAccounts";
import { clientDocumentLabel, clientDocumentSearchText } from "../../lib/clients";
import { formatDateTime, nowIso } from "../../lib/dates";
import { readUploadFile } from "../../lib/files";
import { uid } from "../../lib/ids";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, parseMoneyInput } from "../../lib/money";
import { compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { CashierMovementPanel, MovementTable } from "./MovementTable";
import { clientSortValue, type ClientTableColumn } from "../clients/clientTable";
export { CashierClients } from "./CashierClients";
export { CashierSalaryPayments } from "./CashierSalaryPayments";

const CAPITAL_PEOPLE: CapitalMovementPerson[] = ["RICARDO", "MATHIAS"];
const confirmAction = (message: string) => window.confirm(message);
const clientNameWithDocument = (data: AppData, clientId: string | undefined) => {
  const client = data.clients.find((item) => item.id === clientId);
  return client ? `${client.name} - ${clientDocumentLabel(client)}` : "";
};
export function Expenses({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = data.expenses.filter((item) => item.balanceId === balance.id);
  const activeCategories = data.expenseCategories.filter((category) => category.status === "ACTIVA");
  const [selectedCategoryId, setSelectedCategoryId] = useState(activeCategories[0]?.id ?? "");
  const selectedCategory = activeCategories.find((category) => category.id === selectedCategoryId) ?? activeCategories[0];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const receiptFile = form.get("receiptFile");
    const uploadedReceipt = receiptFile instanceof File && receiptFile.size > 0 ? readUploadFile(receiptFile) : null;
    const expense: Expense = {
      id: uid("expense"),
      balanceId: balance.id,
      category: selectedCategory?.name ?? "",
      subcategory: String(form.get("subcategory") ?? ""),
      amount: parseMoneyInput(form.get("amount")),
      description: String(form.get("description")),
      receipt: uploadedReceipt?.name ?? "",
      receiptFileName: uploadedReceipt?.name,
      receiptFileType: uploadedReceipt?.type,
      receiptDataUrl: undefined,
      status: "ACTIVO",
      userId: user.id,
      createdAt: nowIso(),
    };
    if (!expense.category || !expense.subcategory || !expense.amount) {
      setMessage("Categoria, subcategoria y monto son obligatorios.");
      return;
    }
    patchData((current) =>
      audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, localExpenseAccountMovement(expense, balance.localId)),
          expenses: [expense, ...current.expenses],
        },
        "Crear gasto",
        "Gasto",
        expense.id,
        "",
        expense,
      ),
    );
    setMessage("Gasto guardado.");
    event.currentTarget.reset();
  };

  if (!activeCategories.length) {
    return (
      <CashierMovementPanel title="Cargar gastos" detail="Registro de gastos con categoria, subcategoria y comprobante." totalLabel="gastos" total={items.length} onBack={onBack}>
        <p className="notice">No hay categorias de gastos activas.</p>
      </CashierMovementPanel>
    );
  }

  return (
    <CashierMovementPanel
      title="Cargar gastos"
      detail="Registro de gastos con categoria, subcategoria y comprobante."
      totalLabel="gastos"
      total={items.length}
      onBack={onBack}
    >
      <MovementTable
        columns={["Categoria", "Descripcion", "Monto", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [`${item.category} / ${item.subcategory || "-"}`, item.description || "-", money(item.amount)],
          sortValues: [`${item.category} ${item.subcategory || ""}`, item.description || "", item.amount],
          status: item.status,
        }))}
        actionLabel="Eliminar"
        onAnnul={(id) => deleteExpense(id, balance, patchData, audit, setMessage)}
        createRow={
          <tr className="create-row">
            <td>
              <select value={selectedCategory?.id ?? ""} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select form="expense-create-form" name="subcategory" required>
                {(selectedCategory?.subcategories ?? []).map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input form="expense-create-form" name="description" placeholder="Descripcion opcional" />
              <input form="expense-create-form" name="receiptFile" type="file" accept="image/*,.pdf,application/pdf" />
            </td>
            <td>
              <input form="expense-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>
              <form id="expense-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}


export function Transfers(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = props.data.transfers.filter((item) => item.balanceId === props.balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const transfer: Transfer = {
      id: uid("transfer"),
      balanceId: props.balance.id,
      clientId: String(form.get("clientId") || "") || undefined,
      receipt: String(form.get("receipt")),
      name: String(form.get("name")),
      amount: parseMoneyInput(form.get("amount")),
      account: String(form.get("account") || "Cuenta unica inicial"),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (!transfer.receipt.trim() || !transfer.name.trim() || !transfer.amount) {
      props.setMessage("Comprobante, nombre y monto son obligatorios.");
      return;
    }
    props.patchData((current) =>
      props.audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(
            {
              ...current,
              currentAccounts: current.currentAccounts.some((account) => account.id === TRANSFER_ACCOUNT_ID)
                ? current.currentAccounts
                : [createTransferCurrentAccount(), ...current.currentAccounts],
            },
            props.balance.localId,
          ),
          accountMovements: upsertAccountMovement(
            upsertAccountMovement(current.accountMovements, transferAccountMovement(transfer)),
            localTransferAccountMovement(transfer, props.balance.localId),
          ),
          transfers: [transfer, ...current.transfers],
        },
        "Crear transferencia",
        "Transferencia",
        transfer.id,
        "",
        transfer,
      ),
    );
    props.setMessage("Transferencia guardada.");
    event.currentTarget.reset();
  };

  return (
    <CashierMovementPanel
      title="Cargar transferencias"
      detail="Registro de transferencias con comprobante, nombre, monto y cuenta."
      totalLabel="transferencias"
      total={items.length}
      onBack={props.onBack}
    >
      <MovementTable
        columns={["Cliente", "Nombre", "Comprobante", "Cuenta", "Monto", "Estado", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [clientNameWithDocument(props.data, item.clientId) || "-", item.name, item.receipt, item.account, money(item.amount), item.status],
          sortValues: [clientNameWithDocument(props.data, item.clientId) || "", item.name, item.receipt, item.account, item.amount, item.status],
          status: item.status,
        }))}
        onAnnul={(id) => annulTransfer(id, props.user.id, props.patchData, props.audit)}
        createRow={
          <tr className="create-row">
            <td>
              <select form="transfer-create-form" name="clientId">
                <option value="">Sin cliente</option>
                {props.data.clients
                  .filter((client) => client.status === "ACTIVO")
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {clientDocumentLabel(client)}
                    </option>
                  ))}
              </select>
            </td>
            <td>
              <input form="transfer-create-form" name="name" placeholder="Nombre" required />
            </td>
            <td>
              <input form="transfer-create-form" name="receipt" placeholder="Comprobante" required />
            </td>
            <td>
              <input form="transfer-create-form" name="account" defaultValue="Cuenta unica inicial" />
            </td>
            <td>
              <input form="transfer-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>Nuevo</td>
            <td>
              <form id="transfer-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Guardar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function annulTransfer(
  id: string,
  userId: string,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
) {
  if (!confirmAction("Anular esta transferencia?")) return;
  patchData((current) => {
    const previous = current.transfers.find((item) => item.id === id);
    const transfers = current.transfers.map((item) => (item.id === id ? { ...item, status: "ANULADO" as MovementStatus } : item));
    const accountMovements = reverseSourceAccountMovements(
      current.accountMovements,
      ["TRANSFERENCIA"],
      id,
      userId,
      "Anulacion operativa",
    );
    const next = transfers.find((item) => item.id === id);
    return audit({ ...current, transfers, accountMovements }, "Anular transferencia", "Transferencia", id, previous, next, "Anulacion operativa");
  });
}

export function Gifts(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = props.data.gifts.filter((item) => item.balanceId === props.balance.id);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parseMoneyInput(form.get("amount"));
    const gift: Gift = {
      id: uid("gift"),
      balanceId: props.balance.id,
      clientId: selectedClientIds[0],
      clientIds: selectedClientIds,
      type: "EFECTIVO",
      cashAmount: amount,
      creditAmount: 0,
      reference: String(form.get("reference") ?? ""),
      description: String(form.get("description")),
      status: "ACTIVO",
      userId: props.user.id,
      createdAt: nowIso(),
    };
    if (selectedClientIds.length === 0 || !gift.reference.trim() || amount <= 0) {
      props.setMessage("Cliente, referencia y monto son obligatorios.");
      return;
    }
    props.patchData((current) =>
      props.audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, props.balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, localGiftAccountMovement(gift, props.balance.localId)),
          gifts: [gift, ...current.gifts],
        },
        "Crear regalo",
        "Regalo",
        gift.id,
        "",
        gift,
      ),
    );
    props.setMessage("Regalo guardado.");
    setSelectedClientIds([]);
    event.currentTarget.reset();
  };
  const selectedClientNames = selectedClientIds.map((id) => clientNameWithDocument(props.data, id)).filter(Boolean).join(", ");

  return (
    <CashierMovementPanel
      title="Cargar regalos"
      detail="Registro de regalos en efectivo."
      totalLabel="regalos"
      total={items.length}
      onBack={props.onBack}
    >
      <MovementTable
        columns={["Clientes", "Detalle", "Referencia", "Monto", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          sortValues: [
            (item.clientIds ?? (item.clientId ? [item.clientId] : [])).map((id) => clientNameWithDocument(props.data, id)).filter(Boolean).join(", "),
            item.description,
            item.reference || "",
            item.cashAmount,
          ],
          cells: [
            (item.clientIds ?? (item.clientId ? [item.clientId] : [])).map((id) => clientNameWithDocument(props.data, id)).filter(Boolean).join(", ") || "-",
            item.description,
            item.reference || "-",
            money(item.cashAmount),
          ],
          status: item.status,
        }))}
        actionLabel="Eliminar"
        onAnnul={(id) => deleteGift(id, props.balance, props.patchData, props.audit, props.setMessage)}
        createRow={
          <tr className="create-row">
            <td>
              <button className="button primary compact" type="button" onClick={() => setClientPickerOpen(true)}>
                Seleccionar
              </button>
              <p className="helper">{selectedClientNames || "Sin clientes seleccionados"}</p>
            </td>
            <td>
              <input form="gift-create-form" name="description" placeholder="Detalle opcional" />
            </td>
            <td>
              <select form="gift-create-form" name="reference" defaultValue="Cajero" required>
                <option value="Mathias">Mathias</option>
                <option value="Ricardo">Ricardo</option>
                <option value="Cajero">Cajero</option>
                <option value="Encargado">Encargado</option>
                <option value="Otro">Otro</option>
              </select>
            </td>
            <td>
              <input className="compact-money-input" form="gift-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>
              <form id="gift-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
      {clientPickerOpen && (
        <ClientPickerModal
          clients={props.data.clients.filter((client) => client.status === "ACTIVO")}
          selectedIds={selectedClientIds}
          onChange={setSelectedClientIds}
          onClose={() => setClientPickerOpen(false)}
        />
      )}
    </CashierMovementPanel>
  );
}

function ClientPickerModal({
  clients,
  selectedIds,
  onChange,
  onClose,
}: {
  clients: Client[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<Exclude<ClientTableColumn, "email" | "status">>>({ key: "name", direction: "asc" });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredClients = normalizedQuery
    ? clients.filter((client) =>
        [client.visibleId, client.name, clientDocumentSearchText(client), client.phone, client.email, client.category].join(" ").toLowerCase().includes(normalizedQuery),
      )
    : clients;
  const sortedClients = [...filteredClients].sort((left, right) => {
    const result = compareValues(clientSortValue(left, sort.key), clientSortValue(right, sort.key));
    return sort.direction === "asc" ? result : -result;
  });
  const toggleClient = (clientId: string) => {
    onChange(selectedIds.includes(clientId) ? selectedIds.filter((id) => id !== clientId) : [...selectedIds, clientId]);
  };

  return (
    <Modal title="Seleccionar clientes" onClose={onClose} wide>
      <div className="modal-toolbar">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..." />
        <span>{selectedIds.length} seleccionados</span>
      </div>
      <div className="table-wrap compact-table">
        <table className="data-table compact-data-table">
          <thead>
            <tr>
              <th></th>
              {[
                ["visibleId", "ID"],
                ["name", "Cliente"],
                ["document", "Documento"],
                ["category", "Categoria"],
                ["phone", "Telefono"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button className="sort-button" type="button" onClick={() => setSort((current) => nextSort(current, key as typeof sort.key))}>
                    {label}
                    {sortIndicator(sort, key as typeof sort.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedClients.map((client) => (
              <tr key={client.id}>
                <td>
                  <input type="checkbox" checked={selectedIds.includes(client.id)} onChange={() => toggleClient(client.id)} />
                </td>
                <td>{client.visibleId}</td>
                <td>{client.name}</td>
                <td>{clientDocumentLabel(client)}</td>
                <td>{client.category}</td>
                <td>{client.phone || "-"}</td>
              </tr>
            ))}
            {!sortedClients.length && (
              <tr>
                <td colSpan={6}>No hay clientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="button-row end">
        <button className="button muted" type="button" onClick={() => onChange([])}>
          Limpiar
        </button>
        <button className="button success" type="button" onClick={onClose}>
          Confirmar seleccion
        </button>
      </div>
    </Modal>
  );
}

export function CapitalMovements({
  data,
  balance,
  user,
  patchData,
  audit,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = data.capitalMovements.filter((item) => item.balanceId === balance.id);
  const activeItems = items.filter((item) => item.status === "ACTIVO");
  const totalWithdrawals = activeItems.filter((item) => item.type === "RETIRO").reduce((total, item) => total + item.amount, 0);
  const totalContributions = activeItems.filter((item) => item.type === "APORTE").reduce((total, item) => total + item.amount, 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type") ?? "") as CapitalMovementType;
    if (type !== "RETIRO" && type !== "APORTE") {
      setMessage("Selecciona si es retiro o aporte.");
      return;
    }
    const movement: CapitalMovement = {
      id: uid("capital"),
      balanceId: balance.id,
      localId: balance.localId,
      type,
      medium: String(form.get("medium") ?? "EFECTIVO") as CapitalMovementMedium,
      timing: "OPERATIVO",
      person: String(form.get("person") ?? "RICARDO") as CapitalMovementPerson,
      amount: parseMoneyInput(form.get("amount")),
      note: String(form.get("note") ?? "").trim(),
      status: "ACTIVO",
      userId: user.id,
      createdAt: nowIso(),
    };
    if (!movement.amount || movement.amount <= 0) {
      setMessage("El monto es obligatorio y debe ser mayor a cero.");
      return;
    }
    patchData((current) =>
      audit(
        {
          ...current,
          currentAccounts: ensureLocalCurrentAccounts(current, balance.localId),
          accountMovements: upsertAccountMovement(current.accountMovements, capitalAccountMovement(movement)),
          capitalMovements: [movement, ...current.capitalMovements],
        },
        movement.type === "RETIRO" ? "Crear retiro" : "Crear aporte de capital",
        "MovimientoCapital",
        movement.id,
        "",
        movement,
      ),
    );
    setMessage(movement.type === "RETIRO" ? "Retiro registrado." : "Aporte de capital registrado.");
    event.currentTarget.reset();
  };

  const annulMovement = (id: string) => {
    if (!confirmAction("Anular este retiro/aporte?")) return;
    patchData((current) => {
      const previous = current.capitalMovements.find((item) => item.id === id);
      const capitalMovements = current.capitalMovements.map((item) => (item.id === id ? { ...item, status: "ANULADO" as MovementStatus } : item));
      const accountMovements = reverseSourceAccountMovements(
        current.accountMovements,
        ["RETIRO", "APORTE"],
        id,
        user.id,
        "Anulacion operativa",
      );
      const next = capitalMovements.find((item) => item.id === id);
      return audit({ ...current, capitalMovements, accountMovements }, "Anular retiro/aporte", "MovimientoCapital", id, previous, next, "Anulacion operativa");
    });
    setMessage("Movimiento anulado.");
  };

  return (
    <CashierMovementPanel
      title="Retiros y aportes"
      detail="Movimientos de capital del local en efectivo o por transferencia."
      totalLabel="movimientos"
      total={items.length}
      onBack={onBack}
    >
      <div className="account-summary-grid movement-summary-grid">
        <div>
          <span>Retiros</span>
          <strong>{money(totalWithdrawals)}</strong>
        </div>
        <div>
          <span>Aportes</span>
          <strong>{money(totalContributions)}</strong>
        </div>
        <div>
          <span>Neto capital</span>
          <strong>{money(totalContributions - totalWithdrawals)}</strong>
        </div>
      </div>
      <MovementTable
        columns={["Tipo", "Medio", "Persona", "Monto", "Fecha", "Nota", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.type, item.medium === "EFECTIVO" ? "Efectivo" : "Transferencia", item.person, money(item.amount), formatDateTime(item.createdAt), item.note || "-"],
          sortValues: [item.type, item.medium, item.person, item.amount, item.createdAt, item.note || ""],
          status: item.status,
        }))}
        onAnnul={annulMovement}
        createRow={
          <tr className="create-row">
            <td>
              <select form="capital-create-form" name="type" defaultValue="" required>
                <option value="" disabled>
                  Seleccionar
                </option>
                <option value="RETIRO">Retiro</option>
                <option value="APORTE">Aporte</option>
              </select>
            </td>
            <td>
              <select form="capital-create-form" name="medium" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </td>
            <td>
              <select form="capital-create-form" name="person" defaultValue="RICARDO">
                {CAPITAL_PEOPLE.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input className="compact-money-input" form="capital-create-form" name="amount" inputMode="numeric" defaultValue="0" onFocus={handleMoneyFocus} onChange={handleMoneyInput} onBlur={handleMoneyBlur} required />
            </td>
            <td>Ahora</td>
            <td>
              <input form="capital-create-form" name="note" placeholder="Nota opcional" />
            </td>
            <td>
              <form id="capital-create-form" onSubmit={submit}>
                <button className="button success compact" type="submit">
                  Agregar
                </button>
              </form>
            </td>
          </tr>
        }
      />
    </CashierMovementPanel>
  );
}

function deleteExpense(
  id: string,
  balance: Balance,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
  setMessage: (message: string) => void,
) {
  if (balance.status !== "EN_PROCESO") {
    setMessage("Solo se pueden eliminar gastos antes de cerrar la caja.");
    return;
  }
  if (!confirmAction("Eliminar este gasto de la caja abierta?")) return;
  patchData((current) => {
    const previous = current.expenses.find((expense) => expense.id === id);
    if (!previous) return current;
    return audit(
      {
        ...current,
        accountMovements: current.accountMovements.filter((movement) => movement.sourceType !== "GASTO" || movement.sourceId !== id),
        expenses: current.expenses.filter((expense) => expense.id !== id),
      },
      "Eliminar gasto antes de cierre",
      "Gasto",
      id,
      previous,
      "",
      "Caja abierta",
    );
  });
  setMessage("Gasto eliminado.");
}

function deleteGift(
  id: string,
  balance: Balance,
  patchData: (updater: (current: AppData) => AppData) => void,
  audit: (current: AppData, action: string, entity: string, entityId: string, previousValue: unknown, newValue: unknown, reason?: string) => AppData,
  setMessage: (message: string) => void,
) {
  if (balance.status !== "EN_PROCESO") {
    setMessage("Solo se pueden eliminar regalos antes de cerrar la caja.");
    return;
  }
  if (!confirmAction("Eliminar este regalo de la caja abierta?")) return;
  patchData((current) => {
    const previous = current.gifts.find((gift) => gift.id === id);
    if (!previous) return current;
    return audit(
      {
        ...current,
        accountMovements: current.accountMovements.filter((movement) => movement.sourceType !== "REGALO" || movement.sourceId !== id),
        gifts: current.gifts.filter((gift) => gift.id !== id),
      },
      "Eliminar regalo antes de cierre",
      "Regalo",
      id,
      previous,
      "",
      "Caja abierta",
    );
  });
  setMessage("Regalo eliminado.");
}

