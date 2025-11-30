import { useSelector, useDispatch } from "react-redux";
import api from "../../api/api";
import assets from "../../assets/asset";
import { closeExportModal } from "../../redux/Slice/DashboardSlice";

const ExportModal = () => {
  const { isOpen, dataType } = useSelector(
    (state) => state.dashboard.exportModalState
  );
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const handleExport = async (format) => {
    if (!dataType) return;

    try {
      const response = await api.exportData(dataType, format);
      const url = window.URL.createObjectURL(new Blob([response.data])); // Wraps the binary file in a blob and creates a downloadable link to that blob.
      const link = document.createElement("a"); // <a> tag.
      link.href = url; // Sets the href of the link to the blob URL.
      const filename = `${dataType}.${format === "excel" ? "xlsx" : "pdf"}`;
      link.setAttribute("download", filename); // Tells browser to download it as users.xlsx or orders.pdf etc.
      document.body.appendChild(link);
      link.click(); // Simulates a click on the link (<a> tag) to trigger the download.
      link.parentNode.removeChild(link);
      dispatch(closeExportModal());
    } catch (error) {
      console.error(`Failed to export ${dataType}:`, error);
      // Optionally, dispatch an action to show an error notification
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 w-full max-w-sm animate-fade-in-down">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Export {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
          </h3>
          <button onClick={() => dispatch(closeExportModal())}>
            <img
              src={assets.cross}
              alt="Close"
              className="w-5 h-5 cursor-pointer"
            />
          </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => handleExport("excel")}
            className="w-full cursor-pointer text-left px-4 py-3 text-sm bg-gray-500 hover:bg-white text-black flex items-center justify-between gap-3 transition-colors rounded-lg"
          >
            <span>Export as Excel</span>{" "}
            <img
              src={assets.excel}
              className="w-10 h-10 text-green-500"
              alt="Excel Icon"
            />
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="w-full cursor-pointer text-left px-4 py-6 text-sm bg-gray-500 hover:bg-white text-black flex items-center justify-between gap-3 transition-colors rounded-lg"
          >
            <span>Export as PDF</span>
            <img
              src={assets.pdf}
              className="w-5 h-5 mr-[8px]  text-red-500"
              alt="PDF Icon"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
