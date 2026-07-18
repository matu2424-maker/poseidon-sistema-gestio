import { useState, type FormEvent } from "react";
import type {
  AppData,
  Balance,
  Client,
  FinancialMedium,
  Role,
  TreasuryTransferType,
  User,
} from "../../types";
import { clientDocumentLabel, clientDocumentSearchText } from "../../lib/clients";
import { formatDateTime } from "../../lib/dates";
import { readUploadFile } from "../../lib/files";
import { confirmAction } from "../../lib/confirmations";
import { localAccountBalances } from "../../lib/currentAccounts";
import { balanceVisibleId, roleLabels } from "../../lib/display";
import { handleMoneyBlur, handleMoneyFocus, handleMoneyInput, money, parseMoneyInput } from "../../lib/money";
import { ariaSort, compareValues, nextSort, sortIndicator, type SortState } from "../../lib/sorting";
import { Modal } from "../../components/ui";
import { CashierMovementPanel, MovementTable } from "./MovementTable";
import { clientSortValue, type ClientTableColumn } from "../clients/clientTable";
import { commandContext } from "../../application/command";
import {
  annulTransferCommand,
  createExpenseCommand,
  createGiftCommand,
  createTransferCommand,
  deleteExpenseCommand,
  deleteGiftCommand,
} from "../../application/movements/operatingMovementCommands";
import {
  annulTreasuryTransferCommand,
  createTreasuryTransferCommand,
} from "../../application/treasury/treasuryCommands";
export { CashierClients } from "./CashierClients";
export { CashierSalaryPayments } from "./CashierSalaryPayments";

const clientNameWithDocument = (data: AppData, clientId: string | undefined) => {
  const client = data.clients.find((item) => item.id === clientId);
  return client ? `${client.name} - ${clientDocumentLabel(client)}` : "";
};

function OperatingMovementContext({ data, balance, actorRole }: { data: AppData; balance: Balance; actorRole: Role }) {
  const balances = localAccountBalances(data, balance.localId);
  return (
    <div className="account-summary-grid four movement-context-summary" aria-label="Contexto de la caja activa">
      <div>
        <span>Caja activa</span>
        <strong>{balanceVisibleId(data, balance)}</strong>
      </div>
      <div>
        <span>Efectivo disponible</span>
        <strong>{money(balances.cash)}</strong>
      </div>
      <div>
        <span>Dinero en banco</span>
        <strong>{money(balances.bank)}</strong>
      </div>
      <div>
        <span>Registrando como</span>
        <strong>{roleLabels[actorRole]}</strong>
      </div>
    </div>
  );
}

export function Expenses({
  data,
  balance,
  user,
  actorRole,
  patchData,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  actorRole: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
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
    const input = {
      balanceId: balance.id,
      category: selectedCategory?.name ?? "",
      subcategory: String(form.get("subcategory") ?? ""),
      amount: parseMoneyInput(form.get("amount")),
      description: String(form.get("description")),
      receiptFileName: uploadedReceipt?.name,
      receiptFileType: uploadedReceipt?.type,
    };
    patchData((current) => {
      const result = createExpenseCommand(current, input, commandContext(user, actorRole));
      setMessage(result.ok ? "Gasto guardado." : result.error);
      return result.ok ? result.data : current;
    });
    event.currentTarget.reset();
  };

  const removeExpense = (id: string) => {
    if (!confirmAction("Eliminar este gasto de la caja abierta?")) return;
    patchData((current) => {
      const result = deleteExpenseCommand(current, balance.id, id, commandContext(user, actorRole));
      setMessage(result.ok ? "Gasto eliminado." : result.error);
      return result.ok ? result.data : current;
    });
  };

  if (!activeCategories.length) {
    return (
      <CashierMovementPanel title="Cargar gastos" detail="Registro de gastos con categoria, subcategoria y comprobante." totalLabel="gastos" total={items.length} onBack={onBack} hideTitle={actorRole === "ENCARGADO"}>
        <OperatingMovementContext data={data} balance={balance} actorRole={actorRole} />
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
      hideTitle={actorRole === "ENCARGADO"}
    >
      <OperatingMovementContext data={data} balance={balance} actorRole={actorRole} />
      <MovementTable
        columns={["Categoria", "Descripcion", "Monto", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [`${item.category} / ${item.subcategory || "-"}`, item.description || "-", money(item.amount)],
          sortValues: [`${item.category} ${item.subcategory || ""}`, item.description || "", item.amount],
          status: item.status,
        }))}
        actionLabel="Eliminar"
        onAnnul={removeExpense}
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
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = props.data.transfers.filter((item) => item.balanceId === props.balance.id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      balanceId: props.balance.id,
      clientId: String(form.get("clientId") || "") || undefined,
      receipt: String(form.get("receipt")),
      name: String(form.get("name")),
      amount: parseMoneyInput(form.get("amount")),
      account: String(form.get("account") || "Cuenta unica inicial"),
    };
    props.patchData((current) => {
      const result = createTransferCommand(current, input, commandContext(props.user, "CAJERO"));
      props.setMessage(result.ok ? "Transferencia guardada." : result.error);
      return result.ok ? result.data : current;
    });
    event.currentTarget.reset();
  };

  const annul = (id: string) => {
    if (!confirmAction("Anular esta transferencia?")) return;
    props.patchData((current) => {
      const result = annulTransferCommand(current, props.balance.id, id, commandContext(props.user, "CAJERO"));
      props.setMessage(result.ok ? "Transferencia anulada." : result.error);
      return result.ok ? result.data : current;
    });
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
        onAnnul={annul}
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

export function Gifts(props: {
  data: AppData;
  balance: Balance;
  user: User;
  patchData: (updater: (current: AppData) => AppData) => void;
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
    const input = {
      balanceId: props.balance.id,
      clientIds: selectedClientIds,
      amount,
      reference: String(form.get("reference") ?? ""),
      description: String(form.get("description")),
    };
    props.patchData((current) => {
      const result = createGiftCommand(current, input, commandContext(props.user, "CAJERO"));
      props.setMessage(result.ok ? "Regalo guardado." : result.error);
      return result.ok ? result.data : current;
    });
    setSelectedClientIds([]);
    event.currentTarget.reset();
  };
  const removeGift = (id: string) => {
    if (!confirmAction("Eliminar este regalo de la caja abierta?")) return;
    props.patchData((current) => {
      const result = deleteGiftCommand(current, props.balance.id, id, commandContext(props.user, "CAJERO"));
      props.setMessage(result.ok ? "Regalo eliminado." : result.error);
      return result.ok ? result.data : current;
    });
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
        onAnnul={removeGift}
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
                <th key={key} aria-sort={ariaSort(sort, key as typeof sort.key)}>
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
  actorRole,
  patchData,
  setMessage,
  onBack,
}: {
  data: AppData;
  balance: Balance;
  user: User;
  actorRole: Role;
  patchData: (updater: (current: AppData) => AppData) => void;
  setMessage: (message: string) => void;
  onBack?: () => void;
}) {
  const items = data.treasuryTransfers.filter((item) => item.balanceId === balance.id);
  const activeItems = items.filter((item) => item.status === "ACTIVO");
  const totalWithdrawals = activeItems.filter((item) => item.type === "RETIRO_CAJA").reduce((total, item) => total + item.amount, 0);
  const totalContributions = activeItems.filter((item) => item.type === "APORTE_CAJA").reduce((total, item) => total + item.amount, 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type") ?? "") as TreasuryTransferType;
    if (type !== "RETIRO_CAJA" && type !== "APORTE_CAJA") {
      setMessage("Selecciona el movimiento entre Caja y Principal.");
      return;
    }
    const input = {
      localId: balance.localId,
      balanceId: balance.id,
      type,
      medium: String(form.get("medium") ?? "EFECTIVO") as FinancialMedium,
      timing: "OPERATIVO" as const,
      amount: parseMoneyInput(form.get("amount")),
      note: String(form.get("note") ?? "").trim(),
    };
    patchData((current) => {
      const result = createTreasuryTransferCommand(current, input, commandContext(user, actorRole));
      setMessage(result.ok ? (type === "RETIRO_CAJA" ? "Fondos enviados a Principal." : "Fondos aportados a Caja.") : result.error);
      return result.ok ? result.data : current;
    });
    event.currentTarget.reset();
  };

  const annulMovement = (id: string) => {
    if (!confirmAction("Anular este traspaso entre Caja y Principal?")) return;
    patchData((current) => {
      const result = annulTreasuryTransferCommand(current, id, commandContext(user, actorRole), "Anulado antes del cierre");
      setMessage(result.ok ? "Traspaso anulado." : result.error);
      return result.ok ? result.data : current;
    });
  };

  return (
    <CashierMovementPanel
      title="Caja y Principal"
      detail="Traspasos internos de fondos en pesos. No son ingresos ni egresos economicos."
      totalLabel="movimientos"
      total={items.length}
      onBack={onBack}
      hideTitle={actorRole === "ENCARGADO"}
    >
      <OperatingMovementContext data={data} balance={balance} actorRole={actorRole} />
      <div className="account-summary-grid movement-summary-grid">
        <div>
          <span>Enviado a Principal</span>
          <strong>{money(totalWithdrawals)}</strong>
        </div>
        <div>
          <span>Recibido desde Principal</span>
          <strong>{money(totalContributions)}</strong>
        </div>
        <div>
          <span>Neto en Caja</span>
          <strong>{money(totalContributions - totalWithdrawals)}</strong>
        </div>
      </div>
      <MovementTable
        columns={["Movimiento", "Medio", "Monto", "Fecha", "Nota", "Accion"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.type === "RETIRO_CAJA" ? "Caja a Principal" : "Principal a Caja", item.medium === "EFECTIVO" ? "Efectivo" : "Banco", money(item.amount), formatDateTime(item.createdAt), item.note || "-"],
          sortValues: [item.type, item.medium, item.amount, item.createdAt, item.note || ""],
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
                <option value="RETIRO_CAJA">Caja a Principal</option>
                <option value="APORTE_CAJA">Principal a Caja</option>
              </select>
            </td>
            <td>
              <select form="capital-create-form" name="medium" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo</option>
                <option value="BANCO">Banco</option>
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

