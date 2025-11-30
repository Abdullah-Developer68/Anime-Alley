import { createSlice } from "@reduxjs/toolkit";

// Helper to load modal state from localStorage
function loadModalState() {
  try {
    const stored = localStorage.getItem("dashboardModalState");
    if (stored) return JSON.parse(stored);
  } catch {
    return null;
  }
  return null;
}

// default state of the dashboard slice
const initialState = {
  reloadData: null, // Can be 'products', 'users', 'orders', 'coupons' etc.
  updatedProfilePic: null, // Store updated profile picture URL
  productDeleteModalState: {
    isOpen: false,
    selectedProduct: null,
  },
  userDeleteModalState: {
    isOpen: false,
    selectedUser: null,
  },
  orderDeleteModalState: {
    isOpen: false,
    selectedOrder: null,
  },
  couponDeleteModalState: {
    isOpen: false,
    selectedCoupon: null,
  },
  productFormState: {
    isOpen: false,
    selectedProduct: null,
  },
  userEditFormState: {
    isOpen: false,
    selectedUser: null,
  },
  orderEditFormState: {
    isOpen: false,
    selectedOrder: null,
  },
  couponEditFormState: {
    isOpen: false,
    selectedCoupon: null,
  },
  couponCreateModalState: {
    isOpen: false,
  },
  exportModalState: {
    isOpen: false,
    dataType: null, // To specify 'users', 'products', or 'coupons'
  },
  isSidebarOpen: false, // For responsive Dashbar
};

const persistedState = loadModalState();
const sliceInitialState = persistedState
  ? { ...initialState, ...persistedState } //...initialState -> gives default values & ...persistedState -> overrides matching keys/properties with localStorage values
  : initialState;

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: sliceInitialState,
  reducers: {
    // Generic action to trigger data reloads
    setReloadData: (state, action) => {
      state.reloadData = action.payload;
    },
    // Product Delete Modal
    openProductDeleteModal: (state, action) => {
      state.productDeleteModalState.isOpen = true;
      state.productDeleteModalState.selectedProduct = action.payload;
    },
    closeProductDeleteModal: (state) => {
      state.productDeleteModalState.isOpen = false;
      state.productDeleteModalState.selectedProduct = null;
    },
    // User Delete Modal
    openUserDeleteModal: (state, action) => {
      state.userDeleteModalState.isOpen = true;
      state.userDeleteModalState.selectedUser = action.payload;
    },
    closeUserDeleteModal: (state) => {
      state.userDeleteModalState.isOpen = false;
      state.userDeleteModalState.selectedUser = null;
    },
    // Order Delete Modal
    openOrderDeleteModal: (state, action) => {
      state.orderDeleteModalState.isOpen = true;
      state.orderDeleteModalState.selectedOrder = action.payload;
    },
    closeOrderDeleteModal: (state) => {
      state.orderDeleteModalState.isOpen = false;
      state.orderDeleteModalState.selectedOrder = null;
    },
    // Coupon Delete Modal
    openCouponDeleteModal: (state, action) => {
      state.couponDeleteModalState.isOpen = true;
      state.couponDeleteModalState.selectedCoupon = action.payload;
    },
    closeCouponDeleteModal: (state) => {
      state.couponDeleteModalState.isOpen = false;
      state.couponDeleteModalState.selectedCoupon = null;
    },
    // Product Form Modal ( used to open the same form for edit and adding new items )
    openProductForm: (state, action) => {
      state.productFormState.isOpen = true;
      state.productFormState.selectedProduct = action.payload || null;
    },
    closeProductForm: (state) => {
      state.productFormState.isOpen = false;
      state.productFormState.selectedProduct = null;
    },
    // User Edit Modal
    openUserEditModal: (state, action) => {
      state.userEditFormState.isOpen = true;
      state.userEditFormState.selectedUser = action.payload;
    },
    closeUserEditModal: (state) => {
      state.userEditFormState.isOpen = false;
      state.userEditFormState.selectedUser = null;
    },
    // Order Edit Modal
    openOrderEditModal: (state, action) => {
      state.orderEditFormState.isOpen = true;
      state.orderEditFormState.selectedOrder = action.payload;
    },
    closeOrderEditModal: (state) => {
      state.orderEditFormState.isOpen = false;
      state.orderEditFormState.selectedOrder = null;
    },
    // Coupon Edit Modal
    openCouponEditModal: (state, action) => {
      state.couponEditFormState.isOpen = true;
      state.couponEditFormState.selectedCoupon = action.payload;
    },
    closeCouponEditModal: (state) => {
      state.couponEditFormState.isOpen = false;
      state.couponEditFormState.selectedCoupon = null;
    },
    // Coupon Create Modal
    openCouponCreateModal: (state) => {
      state.couponCreateModalState.isOpen = true;
    },
    closeCouponCreateModal: (state) => {
      state.couponCreateModalState.isOpen = false;
    },
    // Export Modal
    openExportModal: (state, action) => {
      state.exportModalState.isOpen = true;
      state.exportModalState.dataType = action.payload;
    },
    closeExportModal: (state) => {
      state.exportModalState.isOpen = false;
      state.exportModalState.dataType = null;
    },
    openSidebar: (state) => {
      state.isSidebarOpen = true;
    },
    closeSidebar: (state) => {
      state.isSidebarOpen = false;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    // Set updated profile picture
    setUpdatedProfilePic: (state, action) => {
      state.updatedProfilePic = action.payload;
    },
    // Clear updated profile picture
    clearUpdatedProfilePic: (state) => {
      state.updatedProfilePic = null;
    },
  },
});

// Persist modal state to localStorage on every state change
const persistKeys = [
  "productDeleteModalState",
  "userDeleteModalState",
  "orderDeleteModalState",
  "couponDeleteModalState",
  "productFormState",
  "userEditFormState",
  "orderEditFormState",
  "couponEditFormState",
  "couponCreateModalState",
  "exportModalState",
];

// Used to persist the state of the dashboard slice to localStorage
export const persistDashboardModalState = (state) => {
  const toPersist = {};
  persistKeys.forEach((key) => {
    toPersist[key] = state.dashboard[key];
  });
  localStorage.setItem("dashboardModalState", JSON.stringify(toPersist));
};

export const {
  setReloadData,
  setUpdatedProfilePic,
  clearUpdatedProfilePic,
  openProductDeleteModal,
  closeProductDeleteModal,
  openUserDeleteModal,
  closeUserDeleteModal,
  openOrderDeleteModal,
  closeOrderDeleteModal,
  openCouponDeleteModal,
  closeCouponDeleteModal,
  openProductForm,
  closeProductForm,
  openUserEditModal,
  closeUserEditModal,
  openOrderEditModal,
  closeOrderEditModal,
  openCouponEditModal,
  closeCouponEditModal,
  openCouponCreateModal,
  closeCouponCreateModal,
  openExportModal,
  closeExportModal,
  openSidebar,
  closeSidebar,
  toggleSidebar,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;
