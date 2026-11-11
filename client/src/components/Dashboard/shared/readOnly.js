import useAuth from "../../../Hooks/UseAuth";

// True for demo accounts. Their write buttons are disabled here; the server refuses the writes anyway.
export const useReadOnly = () => Boolean(useAuth().user?.isDemo);

export const READ_ONLY_TITLE = "Demo accounts are read-only";
