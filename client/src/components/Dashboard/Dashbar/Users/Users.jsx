import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Download, Pencil, Search, Trash2 } from "lucide-react";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import { openExportModal, openUserDeleteModal, openUserEditModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { formatDate } from "../../../../utils/money";
import EditUser from "./EditUser";
import DeleteUser from "./DeleteUser";
import { canDeleteUser, canEditUser, ROLE_LABELS, ROLE_TONES } from "./permissions";
import PageHeader from "../../shared/PageHeader";
import DemoNotice from "../../shared/DemoNotice";
import { READ_ONLY_TITLE, useReadOnly } from "../../shared/readOnly";
import { emptyCellClass, rowClass, tableClass, tableWrapClass, tdClass, thClass } from "../../shared/tableStyles";
import Avatar from "../../../ui/Avatar";
import Badge from "../../../ui/Badge";
import Button from "../../../ui/Button";
import Pagination from "../../../ui/Pagination";
import { cx, inputClass } from "../../../ui/styles";

const ROLE_FILTERS = [
  { value: "allUsers", label: "All roles" },
  { value: "user", label: "Customers" },
  { value: "admin", label: "Admins" },
  { value: "superAdmin", label: "Super admins" },
];

const Users = () => {
  const dispatch = useDispatch();
  const { user: editor } = useAuth();
  const readOnly = useReadOnly();
  const reloadData = useSelector((state) => state.dashboard.reloadData);
  const [users, setUsers] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ search: "", role: "allUsers" });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getUsers(currPage, query.search, query.role);
      setUsers(data.requiredUsers);
      setTotalPages(data.totalPages);
      setTotalUsers(data.totalUsers);
    } catch (err) {
      setUsers([]);
      setError(err.response?.data?.message || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, [currPage, query]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Edits and deletes ask for a reload through Redux
  useEffect(() => {
    if (reloadData !== "users")
      return;
    loadUsers();
    dispatch(setReloadData(null));
  }, [reloadData, loadUsers, dispatch]);

  const search = (e) => {
    e.preventDefault();
    setCurrPage(1);
    setQuery({ ...query, search: searchInput.trim() });
  };

  return (
    <div className="space-y-6">
      <EditUser />
      <DeleteUser />

      <PageHeader title="Users" description={`${totalUsers} accounts`}>
        <Button variant="secondary" size="sm" onClick={() => dispatch(openExportModal("users"))} disabled={readOnly} title={readOnly ? READ_ONLY_TITLE : undefined}>
          <Download aria-hidden="true" className="size-3.5" />
          Export
        </Button>
      </PageHeader>

      <DemoNotice />

      <div className="flex flex-wrap gap-2">
        <form onSubmit={search} className="relative min-w-60 flex-1 sm:max-w-sm">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            id="user-search"
            type="search"
            value={searchInput}
            maxLength={100}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={readOnly}
            placeholder={readOnly ? "Search is off for demo accounts" : "Search by name or email, then press Enter"}
            className={cx(inputClass, "h-9! pl-9! text-[13px]")}
          />
        </form>
        <label htmlFor="role-filter" className="sr-only">
          Role
        </label>
        <select
          id="role-filter"
          value={query.role}
          onChange={(e) => {
            setCurrPage(1);
            setQuery({ ...query, role: e.target.value });
          }}
          className={cx(inputClass, "h-9! w-auto! text-[13px]")}
        >
          {ROLE_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Joined</th>
              <th className={cx(thClass, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={emptyCellClass}>Loading users…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className={cx(emptyCellClass, "text-danger")}>{error}</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className={emptyCellClass}>No users match.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className={rowClass}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.profilePic} name={u.username} />
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-medium text-ink">
                          {u.username}
                          {editor?.id === u._id && <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span>}
                        </p>
                        <p className="max-w-[220px] truncate text-xs text-subtle">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={u.accountStatus === "active" ? "success" : "warning"}>{u.accountStatus === "active" ? "Active" : "Verifying"}</Badge>
                      {u.isDemo && <Badge tone="violet">Demo</Badge>}
                    </span>
                  </td>
                  <td className={cx(tdClass, "whitespace-nowrap")}>{formatDate(u.createdAt)}</td>
                  <td className={cx(tdClass, "text-right")}>
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.username}`} title={readOnly ? READ_ONLY_TITLE : "Edit"} disabled={!canEditUser(editor, u)} onClick={() => dispatch(openUserEditModal(u))}>
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${u.username}`} title={readOnly ? READ_ONLY_TITLE : "Delete"} disabled={!canDeleteUser(editor, u)} onClick={() => dispatch(openUserDeleteModal(u))}>
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Pagination page={currPage} totalPages={totalPages} onPageChange={setCurrPage} label="User pages" />
      </div>
    </div>
  );
};

export default Users;
