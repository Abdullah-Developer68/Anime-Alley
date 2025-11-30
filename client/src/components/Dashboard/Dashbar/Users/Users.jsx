import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";

import {
  openExportModal,
  openUserEditModal,
  openUserDeleteModal,
} from "../../../../redux/Slice/DashboardSlice";

import EditUser from "./EditUser";
import DeleteUser from "./DeleteUser";
import { toast } from "react-toastify";

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";

    const date = new Date(dateStr);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "N/A";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
    console.log("Editor:", user, "Target:", targetUser);
    if (!canEditUser(targetUser)) {
      toast.error("You do not have the authority to edit this user.");
      return;
    }
    dispatch(openUserEditModal(targetUser));
  };

  const loadUsers = async (
    page = 1,
    search = submittedSearch,
    roleVal = submittedRole
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

  return (
    <div className="p-6 space-y-6">
      <EditUser />
      <DeleteUser />

      {/* Header Section */}
      <div className="flex max-[362px]:flex-col flex-row justify-between max-[362px]:justify-center max-[362px]:items-end gap-4">
        <h1 className="text-2xl font-bold text-white ml-20">Users</h1>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(openExportModal("users"))}
            className="px-4 py-2 bg-gray-300 hover:bg-white text-black cursor-pointer rounded-lg transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:border-pink-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="allUsers" className="bg-gray-400 text-black">
            All Users
          </option>
          <option value="user" className="bg-gray-400 text-black">
            Users
          </option>
          <option value="admin" className="bg-gray-400 text-black">
            Admin
          </option>
          <option value="superAdmin" className="bg-gray-400 text-black">
            Super Admin
          </option>
        </select>
        <button
          className="px-4 py-2 bg-gray-300 hover:bg-white text-black rounded-lg transition-colors"
          onClick={() => {
            setSubmittedSearch(searchQuery);
            setSubmittedRole(role);
            setCurrPage(1); // Reset to first page on new search/filter
          }}
        >
          Load Users
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="relative overflow-x-auto max-h-[600px]">
          <table className="w-full min-w-[800px]">
            <thead className="bg-black/50 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Actions
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-red-400">
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u._id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex justify-start gap-2">
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors"
                          title="Edit"
                          onClick={() => handleEditClick(u)}
                        >
                          <img
                            src={assets.edit}
                            className="w-5 h-5"
                            alt="Edit"
                          />
                        </button>
                        <button
                          className="w-10 h-10 flex items-center justify-center p-2 bg-gray-300 hover:bg-white rounded-lg transition-colors"
                          title="Delete"
                          onClick={() => handleDelete(u)}
                        >
                          <img
                            src={assets.deleteIcon}
                            className="w-5 h-5"
                            alt="Delete"
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center overflow-hidden">
                          {u.profilePic ? (
                            <img
                              src={
                                u.profilePic.startsWith("http")
                                  ? u.profilePic
                                  : u.profilePic // Cloudinary URLs are complete
                              }
                              alt={u.username}
                              className="w-10 h-10 object-cover rounded-full"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = assets.defaultProfile;
                              }}
                            />
                          ) : (
                            <img
                              src={assets.defaultProfile}
                              alt={u.username}
                              className="w-10 h-10 object-cover rounded-full"
                              onError={(e) => {
                                e.target.onerror = null;
                                // Fallback to initials if default image fails
                                e.target.style.display = "none";
                                e.target.nextElementSibling.style.display =
                                  "block";
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {u.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          u.role === "superAdmin"
                            ? "bg-green-500/20 text-green-500"
                            : u.role === "admin"
                            ? "bg-purple-500/20 text-purple-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {u.role === "superAdmin"
                          ? "Super Admin"
                          : u.role === "admin"
                          ? "Admin"
                          : "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-400">
          {users.length > 0
            ? `Showing ${(currPage - 1) * 20 + 1} to ${
                (currPage - 1) * 20 + users.length
              } of ${totalUsers} users`
            : "No users found"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePg("prev")}
            disabled={currPage === 1}
            className="cursor-pointer px-3 py-1 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePg(index + 1)}
              className={`px-3 py-1 rounded-lg ${
                currPage === index + 1
                  ? "text-black bg-white"
                  : "text-white bg-gray-600 hover:bg-gray-500"
              } transition-colors`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => handlePg("next")}
            disabled={currPage === totalPages}
            className="cursor-pointer px-3 py-1 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Users;
