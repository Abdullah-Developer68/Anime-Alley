import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/api";
import { closeExportModal } from "../../redux/Slice/DashboardSlice";
import Modal from "../ui/Modal";
import { cx } from "../ui/styles";

const FORMATS = [
  { id: "excel", label: "Excel spreadsheet", hint: ".xlsx, opens in Excel or Sheets", icon: FileSpreadsheet, extension: "xlsx" },
  { id: "pdf", label: "PDF document", hint: ".pdf, ready to print", icon: FileText, extension: "pdf" },
];

const ExportModal = () => {
  const dispatch = useDispatch();
  const { isOpen, dataType } = useSelector((state) => state.dashboard.exportModalState);
  const [busy, setBusy] = useState(null);

  const download = async ({ id, extension }) => {
    setBusy(id);
    try {
      const { data } = await api.exportData(dataType, id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${dataType}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      dispatch(closeExportModal());
    } catch (error) {
      toast.error(error.response?.data?.message || `Couldn't export ${dataType}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={() => dispatch(closeExportModal())} busy={Boolean(busy)} size="sm" title={`Export ${dataType || ""}`} description="Every record is included, not just the current page.">
      <div className="grid gap-2">
        {FORMATS.map((format) => {
          const Icon = format.icon;
          return (
            <button
              key={format.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => download(format)}
              className={cx("flex items-center gap-3 rounded-lg border border-line p-3.5 text-left transition-colors hover:border-line-strong hover:bg-canvas disabled:opacity-50")}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-sunken text-ink-soft">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-ink">{busy === format.id ? "Preparing…" : format.label}</span>
                <span className="block text-xs text-muted">{format.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};

export default ExportModal;
