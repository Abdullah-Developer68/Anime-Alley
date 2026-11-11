import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../../../api/api";
import { closeUserDeleteModal, setReloadData } from "../../../../redux/Slice/DashboardSlice";
import { ROLE_LABELS } from "./permissions";
import ConfirmDialog from "../../shared/ConfirmDialog";
import Avatar from "../../../ui/Avatar";

const DeleteUser = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedUser } = useSelector((state) => state.dashboard.userDeleteModalState);

  const remove = async () => {
    await api.deleteUser(selectedUser._id);
    toast.success(`${selectedUser.username} deleted.`);
    dispatch(setReloadData("users"));
  };

  return (
    <ConfirmDialog
      open={isOpen && Boolean(selectedUser)}
      onClose={() => dispatch(closeUserDeleteModal())}
      title="Delete user"
      description="They are signed out everywhere and can't log in again."
      confirmWord="DELETE"
      confirmLabel="Delete user"
      onConfirm={remove}
    >
      {selectedUser && (
        <div className="flex items-center gap-3 rounded-lg border border-line p-3 text-[13px]">
          <Avatar src={selectedUser.profilePic} name={selectedUser.username} className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{selectedUser.username}</p>
            <p className="truncate text-muted">
              {selectedUser.email} · {ROLE_LABELS[selectedUser.role]}
            </p>
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
};

export default DeleteUser;
