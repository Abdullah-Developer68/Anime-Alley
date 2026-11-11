import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";
import api from "../../api/api";
import assets from "../../assets/asset";
import { closeExportModal } from "../../redux/Slice/DashboardSlice";

const FORMATS = [
  { id: "excel", label: "Excel workbook", hint: "Sortable .xlsx with one row per record", extension: "xlsx", icon: assets.excel },
  { id: "pdf", label: "PDF report", hint: "Printable A4 landscape table", extension: "pdf", icon: assets.pdf },
];

// The request asks for a blob, so a JSON error body also arrives as a blob and has to be read back
const readErrorMessage = async (error) => {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message;
    } catch {
      return null;
    }
  }
  return data?.message;
};

const ExportModal = () => {
  const { isOpen, dataType } = useSelector((state) => state.dashboard.exportModalState);
  const dispatch = useDispatch();
  const [pendingFormat, setPendingFormat] = useState(null);

  if (!isOpen) return null;

  const close = () => {
    if (!pendingFormat) dispatch(closeExportModal());
  };

  const handleExport = async ({ id, extension }) => {
    if (!dataType || pendingFormat) return;
    setPendingFormat(id);
    try {
      const response = await api.exportData(dataType, id);
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anime-alley-${dataType}-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      dispatch(closeExportModal());
    } catch (error) {
      console.error(`Failed to export ${dataType}:`, error);
      toast.error((await readErrorMessage(error)) || `Could not export ${dataType}. Please try again.`);
    } finally {
      setPendingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl shadow-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="export-title" className="text-lg font-semibold capitalize text-white">
              Export {dataType}
            </h2>
            <p className="mt-0.5 text-sm text-ink-400">Every record is included, not just this page.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleExport(format)}
              disabled={Boolean(pendingFormat)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                <img src={format.icon} alt="" className="h-6 w-6 object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">{format.label}</span>
                <span className="block text-xs text-ink-400">{format.hint}</span>
              </span>
              {pendingFormat === format.id && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-ink-300" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
