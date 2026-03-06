"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  username: string;
  email: string | null;
  householdId: string;
  isAdmin: boolean;
  createdAt: string;
};

type Household = {
  id: string;
  name: string;
};

type EditState = {
  username: string;
  email: string;
  password: string;
  householdId: string;
  isAdmin: boolean;
};

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminUserManager({
  currentUserId,
  households,
}: {
  currentUserId: string;
  households: Household[];
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newHouseholdId, setNewHouseholdId] = useState(households[0]?.id ?? "");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  async function loadUsers() {
    const rows = await apiFetch<User[]>("/users");
    setUsers(rows);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function flash(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setMessage(null);
    } else {
      setMessage(msg);
      setError(null);
    }
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditState({
      username: user.username,
      email: user.email ?? "",
      password: "",
      householdId: user.householdId,
      isAdmin: user.isAdmin,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(userId: string) {
    if (!editState) return;
    flash(null as unknown as string);
    try {
      const body: Record<string, unknown> = {
        username: editState.username,
        email: editState.email || undefined,
        householdId: editState.householdId,
        isAdmin: editState.isAdmin,
      };
      if (editState.password) body.password = editState.password;

      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      flash("User updated.");
      cancelEdit();
      await loadUsers();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to update user.", true);
    }
  }

  async function archiveUser(userId: string, username: string) {
    if (!confirm(`Archive user "${username}"? They will no longer be able to log in.`)) return;
    flash(null as unknown as string);
    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      flash(`User "${username}" archived.`);
      await loadUsers();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to archive user.", true);
    }
  }

  async function createUser() {
    flash(null as unknown as string);
    if (!newUsername.trim()) return flash("Username is required.", true);
    if (!newPassword) return flash("Password is required.", true);
    if (newPassword.length < 8) return flash("Password must be at least 8 characters.", true);
    if (!newHouseholdId) return flash("Please select a family.", true);

    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim() || undefined,
          password: newPassword,
          householdId: newHouseholdId,
          isAdmin: newIsAdmin,
        }),
      });
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      flash("User created.");
      await loadUsers();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to create user.", true);
    }
  }

  const householdName = (id: string) => households.find((h) => h.id === id)?.name ?? id;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Users (Admin)
      </h3>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* User table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Username</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Family</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) =>
              editingId === user.id && editState ? (
                <tr key={user.id} className="bg-muted/30">
                  <td className="px-3 py-2">
                    <input
                      value={editState.username}
                      onChange={(e) => setEditState({ ...editState, username: e.target.value })}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editState.email}
                      onChange={(e) => setEditState({ ...editState, email: e.target.value })}
                      placeholder="email (optional)"
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={editState.householdId}
                      onChange={(e) => setEditState({ ...editState, householdId: e.target.value })}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                    >
                      {households.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editState.isAdmin}
                        onChange={(e) => setEditState({ ...editState, isAdmin: e.target.checked })}
                        className="rounded"
                      />
                      Admin
                    </label>
                  </td>
                  <td className="px-3 py-2 space-y-1.5">
                    <input
                      value={editState.password}
                      onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                      type="password"
                      placeholder="new password (optional)"
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit(user.id)}
                        className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded border border-border px-3 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={user.id}>
                  <td className="px-4 py-2.5 font-medium">{user.username}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{user.email ?? "—"}</td>
                  <td className="px-4 py-2.5">{householdName(user.householdId)}</td>
                  <td className="px-4 py-2.5">
                    {user.isAdmin ? (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                        Admin
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">User</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(user)}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      Edit
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => void archiveUser(user.id, user.username)}
                        className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              )
            )}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user form */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Create User
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Username *
            </span>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="alice"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Email
            </span>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="alice@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Password *
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="min 8 chars"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Family
            </span>
            <select
              value={newHouseholdId}
              onChange={(e) => setNewHouseholdId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Admin</span>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void createUser()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground w-full"
            >
              Create User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Self-service / profile view ───────────────────────────────────────────────

function MyProfileEditor({ me }: { me: User }) {
  const [email, setEmail] = useState(me.email ?? "");
  const [username, setUsername] = useState(me.username);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        email: email.trim() || undefined,
        username: username.trim(),
      };
      if (password) body.password = password;

      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setPassword("");
      setMessage("Profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile.");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        My Profile
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-primary">
            Username
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-primary">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-primary">
            New Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="leave blank to keep current"
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Save Profile
      </button>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function UserManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Always load own profile — available to all authenticated users
        const myProfile = await apiFetch<User>("/users/me");
        setMe(myProfile);

        if (myProfile.isAdmin) {
          // Admin: also load all households for dropdowns
          try {
            const allHouseholds = await apiFetch<Household[]>("/households");
            setHouseholds(allHouseholds);
          } catch {
            // Fallback: at least expose own household
            setHouseholds([{ id: myProfile.householdId, name: "Current household" }]);
          }
          setIsAdmin(true);
        }
      } catch {
        // If /users/me 401s or fails entirely, hide the section
      }
      setReady(true);
    }
    void bootstrap();
  }, []);

  if (!ready || !me) return null;

  return (
    <div className="space-y-4">
      {isAdmin && <AdminUserManager currentUserId={me.id} households={households} />}
      <MyProfileEditor me={me} />
    </div>
  );
}
