import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";

import {
  openExportModal,
  openUserEditModal,
  openUserDeleteModal,
} from "../../../../redux/Slice/DashboardSlice";

import EditUser from "./EditUser";
import DeleteUser from "./DeleteUser";
import { toast } from "react-toastify";
import { Download, Search } from "lucide-react";
import DashboardPagination from "../../DashboardPagination";
import DataTable, { Avatar, RowActions, StatusDot, Stacked } from "../../DataTable";
import { PageHeader, ToolbarButton } from "../../DashboardUI";
import { formatDate } from "../../../../utils/formatDate";

const ROLE_LABELS = { superAdmin: "Super admin", admin: "Admin", user: "Customer" };

const ROLE_OPTIONS = [
  { value: "allUsers", label: "All roles" },
  { value: "user", label: "Customers" },
  { value: "admin", label: "Admins" },
  { value: "superAdmin", label: "Super admins" },
];

const USER_COLUMNS = [
  {
    key: "user",
    header: "User",
    width: "w-[42%]",
    render: (u) => (
      <Stacked
        leading={<Avatar src={u.profilePic} name={u.username} size="h-9 w-9" />}
        title={u.username}
        subtitle={u.email}
      />
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (u) => (
      <span className="inline-flex rounded-md border border-white/10 px-2 py-0.5 text-xs font-medium text-ink-200">
        {ROLE_LABELS[u.role] || u.role}
      </span>
    ),
  },
  {
    key: "status",
    header: "Account",
    render: (u) => (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        {u.accountStatus === "verifying" ? (
          <StatusDot tone="warning">Unverified</StatusDot>
        ) : (
          <StatusDot tone="success">Active</StatusDot>
        )}
        {u.isDemo && <span className="text-xs text-ink-400">Demo</span>}
      </span>
    ),
  },
  {
    key: "joined",
    header: "Joined",
    render: (u) => <span className="tabular-nums text-ink-200">{formatDate(u.createdAt)}</span>,
  },
];

const Users = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [currPage, setCurrPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState("allUsers");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedRole, setSubmittedRole] = useState("allUsers");
  const [error, setError] = useState("");

  // Redux reload trigger
  const reloadDataType = useSelector((state) => state.dashboard.reloadData);

  const canEditUser = (targetUser) => {
    if (!user?.role || !targetUser?.role) return false;
    // Allow editing self
    if (user.email && targetUser.email && user.email === targetUser.email)
      return true;
    const roleHierarchy = {
      superAdmin: 3,
      admin: 2,
      user: 1,
    };
    const editorRank = roleHierarchy[user.role] || 0;
    const targetRank = roleHierarchy[targetUser.role] || 0;
    return editorRank > targetRank;
  };

  const handleEditClick = (targetUser) => {
    if (user.role === "user") {
      toast.error("You do not have the authority to edit users.");
      return;
    }
    if (!canEditUser(targetUser)) {
      toast.error("You do not have the authority to edit this user.");
      return;
    }
    dispatch(openUserEditModal(targetUser));
  };

  const loadUsers = async (
    page = 1,
    search = submittedSearch,
    roleVal = submittedRole,
  ) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getUsers(page, search, roleVal);
      if (res.data.success) {
        setUsers(res.data.requiredUsers);
        setTotalPages(res.data.totalPages);
        setTotalUsers(res.data.totalUsers);
      } else {
        setError(res.data.message || "Failed to fetch users.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Load users on page/search/role change or when reload is triggered
  useEffect(() => {
    loadUsers(currPage, submittedSearch, submittedRole);

    // Reset reloadDataType if it was 'users'
    if (reloadDataType === "users") {
      dispatch({ type: "dashboard/setReloadData", payload: null });
    }
  }, [currPage, submittedSearch, submittedRole, user?.email, reloadDataType]);

  const handlePg = (value) => {
    let newPage;
    if (value === "next" && currPage < totalPages) newPage = currPage + 1;
    else if (value === "prev" && currPage > 1) newPage = currPage - 1;
    else if (typeof value === "number") newPage = value;
    else return;
    setCurrPage(newPage);
  };

  const handleDelete = (userToDelete) => {
    if (user.email && userToDelete.email && user.email === userToDelete.email) {
      toast.error("You cannot delete yourself.");
      return;
    }
    if (!canEditUser(userToDelete)) {
      toast.error("You do not have the authority to delete this user.");
      return;
    }
    dispatch(openUserDeleteModal(userToDelete));
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery);
    setSubmittedRole(role);
    setCurrPage(1); // Reset to first page on new search/filter
  };

  const fieldClass =
    "h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white transition-colors placeholder:text-ink-500 hover:border-white/20 focus:border-pink-500/60 focus:outline-none";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <EditUser />
      <DeleteUser />

      <PageHeader title="Users" subtitle={loading ? "Loading users…" : `${totalUsers} accounts`}>
        <ToolbarButton icon={Download} label="Export" onClick={() => dispatch(openExportModal("users"))} />
      </PageHeader>

      <form onSubmit={submitSearch} role="search" className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            placeholder="Search by name or email"
            className={`${fieldClass} w-full pl-9`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Filter by role</span>
            <select className={`${fieldClass} w-full cursor-pointer`} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-ink-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 shrink-0 cursor-pointer rounded-lg bg-white/[0.08] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.14]"
          >
            Search
          </button>
        </div>
      </form>

      <DataTable
        label="Users"
        columns={USER_COLUMNS}
        rows={users}
        rowKey={(u) => u._id}
        loading={loading}
        error={error}
        emptyMessage="No users match this search."
        actions={(u) => (
          <RowActions name={u.username} onEdit={() => handleEditClick(u)} onDelete={() => handleDelete(u)} />
        )}
      />

      <DashboardPagination
        currPage={currPage}
        totalPages={totalPages}
        totalItems={totalUsers}
        itemCount={users.length}
        pageSize={20}
        label="users"
        onPageChange={handlePg}
      />
    </div>
  );
};

export default Users;
