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
import ConfirmDeleteDialog, { DeletePreview } from "../../ConfirmDeleteDialog";
import { Avatar } from "../../DataTable";

const ROLE_LABELS = { superAdmin: "Super admin", admin: "Admin", user: "Customer" };

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

  const isSelf = Boolean(editor.email && editor.email === selectedUser.email);
  const blockedReason = !deleteDisabled
    ? null
    : isSelf
      ? "You can't delete your own account."
      : "Your role doesn't allow deleting this account. Only a higher role can remove it.";

  return (
    <ConfirmDeleteDialog
      title="Delete user"
      description="Their account will be permanently removed. This can't be undone."
      preview={
        <DeletePreview
          media={<Avatar src={selectedUser.profilePic} name={selectedUser.username} size="h-12 w-12" />}
          title={selectedUser.username}
          details={[selectedUser.email, ROLE_LABELS[selectedUser.role] || selectedUser.role]}
        />
      }
      phrase="CONFIRM"
      value={confirmText}
      onChange={setConfirmText}
      error={error}
      isDeleting={isDeleting}
      blockedReason={blockedReason}
      confirmLabel="Delete user"
      onCancel={handleClose}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteUser;
