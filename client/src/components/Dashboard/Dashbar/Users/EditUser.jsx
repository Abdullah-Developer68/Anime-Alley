import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  closeUserEditModal,
  setReloadData,
  setUpdatedProfilePic,
} from "../../../../redux/Slice/DashboardSlice";
import useAuth from "../../../../Hooks/UseAuth";
import api from "../../../../api/api";
import assets from "../../../../assets/asset";
import { toast } from "react-toastify";

const roleOptions = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const EditUser = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedUser } = useSelector(
    (state) => state.dashboard.userEditFormState,
  );
  const { user } = useAuth(); // Get user from the auth context
  const editor = user || {}; // Fallback to empty object if user is not available

  // Helper function to format date with fallback for invalid dates
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";

    const date = new Date(dateStr);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString();
  };
  const [selectedUserRole, setSelectedUserRole] = useState("");
  const [roleDropdownOptions, setRoleDropdownOptions] = useState(roleOptions);
  const [roleDropdownDisabled, setRoleDropdownDisabled] = useState(false);
  const [allControlsDisabled, setAllControlsDisabled] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [previewPic, setPreviewPic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "",
      email: "",
      role: "user",
      password: "",
    },
  });

  useEffect(() => {
    if (selectedUser) {
      reset({
        username: selectedUser.username || "",
        email: selectedUser.email || "",
        role: selectedUser.role || "user",
        password: "",
      });

      // Set preview picture logic
      let previewUrl = assets.defaultProfile; // Default fallback

      if (selectedUser.profilePic) {
        // If user has a profile picture, use it directly (Cloudinary URLs are complete)
        previewUrl = selectedUser.profilePic;
      }

      setPreviewPic(previewUrl);
    }
  }, [selectedUser, reset]);

  // Keep selectedUserRole in sync
  useEffect(() => {
    if (selectedUser) {
      setSelectedUserRole(selectedUser.role || "user");
    }
  }, [selectedUser]);

  // Determine control disabling logic
  useEffect(() => {
    // Default: all enabled
    let disableAll = false;
    let disableRoleDropdown = false;
    let dropdownOptions = roleOptions;
    // If editing self, allow all except role
    if (editor.email && selectedUser && editor.email === selectedUser.email) {
      disableAll = false;
      disableRoleDropdown = true;
    } else if (editor.role === "user") {
      disableAll = true;
      disableRoleDropdown = true;
    } else if (editor.role === "admin") {
      // Admins: can only edit users, cannot change roles
      if (selectedUserRole !== "user") {
        disableAll = true;
      } else {
        disableRoleDropdown = true;
      }
    } else if (editor.role === "superAdmin") {
      // SuperAdmin: can edit users and admins, not superAdmins
      if (selectedUserRole === "superAdmin") {
        disableAll = true;
        disableRoleDropdown = true;
      } else {
        // Can only change between user/admin
        dropdownOptions = roleOptions;
        disableRoleDropdown = false;
      }
    }
    setAllControlsDisabled(disableAll);
    setRoleDropdownDisabled(disableRoleDropdown);
    setRoleDropdownOptions(dropdownOptions);
  }, [editor.role, selectedUserRole, editor.email, selectedUser]);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewPic(URL.createObjectURL(file));
    } else {
      // If no file selected, reset to original or default
      setProfilePic(null);
      setPreviewPic(selectedUser?.profilePic || assets.defaultProfile);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    setError("");
    try {
      const payload = { ...data };
      if (profilePic) {
        payload.profilePic = profilePic;
      }
      const res = await api.updateUser(selectedUser._id, payload);
      if (res.data.success) {
        toast.success("User updated successfully!");

        // If the editor is updating their own profile, dispatch the updated profile picture
        if (editor.id === selectedUser._id) {
          dispatch(setUpdatedProfilePic(res.data.user.profilePic));
        }

        dispatch(setReloadData("users"));
        // Reset states before closing
        setProfilePic(null);
        setPreviewPic("");
        setError("");
        dispatch(closeUserEditModal());
      } else {
        setError(res.data.message || "Failed to update user.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset states when closing
    setProfilePic(null);
    setPreviewPic("");
    setError("");
    dispatch(closeUserEditModal());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-white">Edit User</h3>
        <div className="flex flex-col items-center mb-4">
          <img
            src={previewPic || assets.defaultProfile}
            alt="Profile"
            className="object-cover w-20 h-20 mb-2 border-2 border-pink-500 rounded-full"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = assets.defaultProfile;
            }}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handlePicChange}
            className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
            disabled={allControlsDisabled}
          />
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Username
            </label>
            <input
              type="text"
              {...register("username", { required: true })}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
              disabled={allControlsDisabled}
            />
            {errors.username && (
              <span className="text-xs text-red-400">Username is required</span>
            )}
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Email
            </label>
            <input
              type="email"
              {...register("email", { required: true })}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
              disabled={allControlsDisabled}
            />
            {errors.email && (
              <span className="text-xs text-red-400">Email is required</span>
            )}
          </div>
          {/* Only show the entire Role field if superAdmin (not editing self) or editing self */}
          {(editor.role === "superAdmin" &&
            !(
              editor.email &&
              selectedUser &&
              editor.email === selectedUser.email
            )) ||
          (editor.email &&
            selectedUser &&
            editor.email === selectedUser.email) ? (
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-400">
                Role
              </label>
              {editor.role === "superAdmin" &&
              !(
                editor.email &&
                selectedUser &&
                editor.email === selectedUser.email
              ) ? (
                <select
                  {...register("role")}
                  className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
                  disabled={roleDropdownDisabled || allControlsDisabled}
                >
                  {roleDropdownOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="text-black bg-gray-400"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400">
                  {selectedUser.role} you can not change your own role.
                </p>
              )}
            </div>
          ) : null}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Joined Date
            </label>
            <p className="w-full px-3 py-2 text-gray-300 border rounded-lg bg-white/5 border-white/10">
              {formatDate(selectedUser?.createdAt)}
            </p>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">
              Password (leave blank to keep unchanged)
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-3 py-2 text-white border rounded-lg bg-white/5 border-white/10"
              autoComplete="new-password"
              disabled={allControlsDisabled}
            />
          </div>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-black bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-black bg-gray-300 rounded-lg cursor-pointer hover:bg-white"
              disabled={isSaving || allControlsDisabled}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
