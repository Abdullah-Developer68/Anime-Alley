import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import { closeUserEditModal, setReloadData, setUpdatedProfilePic } from "../../../../redux/Slice/DashboardSlice";
import { canChangeCredentials, canChangeRole } from "./permissions";
import Modal from "../../../ui/Modal";
import Avatar from "../../../ui/Avatar";
import Button from "../../../ui/Button";
import { inputClass, labelClass } from "../../../ui/styles";

const MAX_BYTES = 4 * 1024 * 1024;

const EditUser = () => {
  const dispatch = useDispatch();
  const { user: editor, setUser } = useAuth();
  const { isOpen, selectedUser } = useSelector((state) => state.dashboard.userEditFormState);
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState("");
  const credentials = canChangeCredentials(editor, selectedUser);
  const roleEditable = canChangeRole(editor, selectedUser);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { username: "", email: "", role: "user", password: "" },
  });

  useEffect(() => {
    if (!selectedUser)
      return;
    reset({ username: selectedUser.username || "", email: selectedUser.email || "", role: selectedUser.role || "user", password: "" });
    setPicture(null);
    setPreview(selectedUser.profilePic || "");
  }, [selectedUser, reset]);

  const pickPicture = (e) => {
    const file = e.target.files[0];
    if (!file)
      return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_BYTES) {
      e.target.value = "";
      return toast.error("Use a JPG, PNG or WebP image of 4 MB or less.");
    }
    setPicture(file);
    setPreview(URL.createObjectURL(file));
  };

  const close = () => dispatch(closeUserEditModal());

  const onSubmit = async (form) => {
    // Only fields this editor may change are sent; empty values mean "keep the current one"
    const payload = { username: form.username.trim() };
    if (credentials) {
      payload.email = form.email.trim();
      payload.password = form.password;
    }
    if (roleEditable)
      payload.role = form.role;
    if (picture)
      payload.profilePic = picture;

    try {
      const { data } = await api.updateUser(selectedUser._id, payload);
      toast.success("User updated.");
      if (editor?.id === selectedUser._id) {
        dispatch(setUpdatedProfilePic(data.user.profilePic));
        setUser({ ...editor, username: data.user.username, email: data.user.email, profilePic: data.user.profilePic });
      }
      dispatch(setReloadData("users"));
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update the user.");
    }
  };

  return (
    <Modal
      open={isOpen && Boolean(selectedUser)}
      onClose={close}
      busy={isSubmitting}
      title="Edit user"
      description={selectedUser?.email}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={preview} name={selectedUser?.username} className="size-14 text-lg" />
          <label className={`${labelClass} mb-0 cursor-pointer rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] text-ink hover:bg-sunken`}>
            Change photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPicture} className="sr-only" />
          </label>
        </div>

        <div>
          <label htmlFor="edit-username" className={labelClass}>Username</label>
          <input
            id="edit-username"
            className={inputClass}
            aria-invalid={errors.username ? "true" : "false"}
            {...register("username", {
              validate: (value) => (value.trim().length >= 2 && value.trim().length <= 40) || "Username must be 2 to 40 characters.",
            })}
          />
          {errors.username && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.username.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-email" className={labelClass}>Email</label>
          <input id="edit-email" type="email" disabled={!credentials} className={inputClass} {...register("email")} />
          {!credentials && <p className="mt-1.5 text-xs text-muted">Only the account owner can change their email or password.</p>}
        </div>

        {credentials && (
          <div>
            <label htmlFor="edit-password" className={labelClass}>New password</label>
            <input
              id="edit-password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep the current one"
              className={inputClass}
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password", {
                validate: (value) => !value || (value.length >= 8 && value.length <= 72) || "Use 8 to 72 characters.",
              })}
            />
            {errors.password ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
            ) : (
              <p className="mt-1.5 text-xs text-muted">Changing it signs you out on your other devices.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="edit-role" className={labelClass}>Role</label>
          <select id="edit-role" disabled={!roleEditable} className={inputClass} {...register("role")}>
            {selectedUser?.role === "superAdmin" && <option value="superAdmin">Super admin</option>}
            <option value="admin">Admin</option>
            <option value="user">Customer</option>
          </select>
          {!roleEditable && <p className="mt-1.5 text-xs text-muted">Only super admins change roles, and never their own.</p>}
        </div>
      </form>
    </Modal>
  );
};

export default EditUser;
