import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeUserDeleteModal,
  setReloadData,
} from "../../../../redux/Slice/DashboardSlice";
import api from "../../../../api/api";
import useAuth from "../../../../Hooks/UseAuth";
import React from "react";
import { toast } from "react-toastify";

const DeleteUser = () => {
  const dispatch = useDispatch();
  const { userDeleteModalState } = useSelector((state) => state.dashboard);
  const { isOpen, selectedUser } = userDeleteModalState;
  const { user } = useAuth();
  const editor = user || {};
  const [selectedUserRole, setSelectedUserRole] = useState("");
  const [deleteDisabled, setDeleteDisabled] = useState(false);

  // Set selected user role
  React.useEffect(() => {
    if (selectedUser) {
      setSelectedUserRole(selectedUser.role || "user");
    }
  }, [selectedUser]);

  // Determine delete disabling logic
  React.useEffect(() => {
    let disabled = false;
    // Prevent self-delete
    if (editor.email && selectedUser && editor.email === selectedUser.email) {
      disabled = true;
    } else if (editor.role === "user") {
      disabled = true;
    } else if (editor.role === "admin") {
      if (selectedUserRole !== "user") {
        disabled = true;
      }
    } else if (editor.role === "superAdmin") {
      if (selectedUserRole === "superAdmin") {
        disabled = true;
      }
    }
    setDeleteDisabled(disabled);
  }, [editor.role, selectedUserRole, editor.email, selectedUser]);

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "CONFIRM") {
      setError("You must type CONFIRM to delete this user.");
      return;
    }
    try {
      setIsDeleting(true);
      setError("");
      const response = await api.deleteUser(selectedUser._id);
      if (response.data.success) {
        toast.success("User deleted successfully!");
        dispatch(setReloadData("users"));
        handleClose();
      } else {
        setError(response.data.message || "Failed to delete user");
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "An error occurred while deleting the user",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    dispatch(closeUserDeleteModal());
  };

  if (!isOpen || !selectedUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-gray-900 border rounded-xl border-red-500/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-red-500">Delete User</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 mb-6 border rounded-lg bg-white/5 border-white/10">
          <h3 className="mb-3 text-sm font-medium text-gray-400">
            User to be deleted:
          </h3>
          <div>
            <p className="font-medium text-white">{selectedUser.username}</p>
            <p className="text-sm text-gray-400">Email: {selectedUser.email}</p>
            <p className="text-sm text-gray-400">Role: {selectedUser.role}</p>
          </div>
        </div>
        <div className="p-3 mb-4 border rounded-lg bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-2">
            <svg
              className="flex-shrink-0 w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-400">
              This action cannot be undone. Type CONFIRM below to enable
              deletion.
            </p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-400">
            Type CONFIRM to delete this user:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError("");
            }}
            placeholder="Type: CONFIRM"
            className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10 placeholder:text-white/30 focus:outline-none focus:border-red-500"
            disabled={isDeleting}
          />
        </div>
        {error && (
          <div className="p-3 mb-4 border rounded-lg bg-red-500/10 border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-black transition-colors bg-gray-300 rounded-lg hover:bg-white"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== "CONFIRM" || deleteDisabled}
            className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUser;
