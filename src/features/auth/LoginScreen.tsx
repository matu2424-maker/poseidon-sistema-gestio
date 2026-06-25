import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { mockUsers, roleLabels, type MockUser } from "./users";

type LoginScreenProps = {
  onBack: () => void;
  onLogin: (user: MockUser) => void;
};

export function LoginScreen({ onBack, onLogin }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState(mockUsers[0].id);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const selectedUser = useMemo(
    () => mockUsers.find((user) => user.id === selectedUserId) ?? mockUsers[0],
    [selectedUserId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.trim() !== selectedUser.password) {
      setError("La contrasena no coincide con el usuario seleccionado.");
      return;
    }

    setError("");
    onLogin(selectedUser);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <button className="icon-button auth-back" type="button" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="brand-mark" aria-hidden="true">
          P
        </div>

        <div className="auth-heading">
          <p>Poseidon</p>
          <h1 id="login-title">Ingresar al sistema</h1>
          <span>Local activo: Poseidon</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="user">Usuario</label>
          <select id="user" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            {mockUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {roleLabels[user.role]}
              </option>
            ))}
          </select>

          <label htmlFor="password">Contrasena</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`Clave: ${selectedUser.password}`}
            autoComplete="current-password"
          />

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button full-width" type="submit">
            <LogIn size={18} aria-hidden="true" />
            Ingresar
          </button>
        </form>

        <div className="mock-help" aria-label="Usuarios simulados">
          {mockUsers.map((user) => (
            <span key={user.id}>
              {user.id}: {user.password}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
