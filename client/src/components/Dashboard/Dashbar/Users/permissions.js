// Mirrors the server's rules (user.controller.js) so the UI only offers allowed actions.
// The server still checks every request.

const isSelf = (editor, target) => Boolean(editor?.id && target?._id && editor.id === String(target._id));

export const canEditUser = (editor, target) => {
  if (!editor || !target || editor.isDemo)
    return false;
  if (isSelf(editor, target))
    return true;
  if (editor.role === "superAdmin")
    return target.role !== "superAdmin";
  return editor.role === "admin" && target.role === "user";
};

export const canDeleteUser = (editor, target) => !isSelf(editor, target) && canEditUser(editor, target);

// Only the account owner may change the login email or password
export const canChangeCredentials = (editor, target) => isSelf(editor, target) && !editor.isDemo;

// Only superAdmins change roles, and only between user and admin, never their own
export const canChangeRole = (editor, target) =>
  editor?.role === "superAdmin" && !isSelf(editor, target) && target?.role !== "superAdmin" && !editor.isDemo;

export const ROLE_LABELS = { superAdmin: "Super admin", admin: "Admin", user: "Customer" };
export const ROLE_TONES = { superAdmin: "ink", admin: "info", user: "neutral" };
