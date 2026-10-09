import { Download } from "lucide-react";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { ActionButton } from "@/components/form";
import { removeUploadAction } from "@/features/steps/actions";
import { formatBytes } from "@/lib/format/file";
import { formatDate } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const f = t.client.files;

export type ListedFile = {
  id: string;
  name: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
  uploader?: string;
  removable?: boolean;
};

// Uploaded files as an inset grouped list: name, size and date (DESIGN.md, Upload).
// `inCard` is false when the list already sits inside a card (no nested shadows).
export function FileList({ files, empty = f.empty, inCard = true, label }: { files: ListedFile[]; empty?: string; inCard?: boolean; label?: string }) {
  if (files.length === 0) return <p className="text-ink-secondary">{empty}</p>;
  return (
    <InsetGroupedList inCard={inCard} label={label}>
      {files.map((file) => (
        <InsetRow
          key={file.id}
          actions={
            file.removable && (
              <ActionButton action={removeUploadAction.bind(null, file.id)} label={t.common.remove} ariaLabel={t.client.upload.remove(file.name)} variant="ghost" />
            )
          }
        >
          <div className="flex flex-col py-1">
            {file.url ? (
              <a href={file.url} download={file.name} className="inline-flex items-center gap-2 break-all font-medium underline-offset-3 hover:underline hover:decoration-focus">
                <Icon icon={Download} className="text-ink-secondary" />
                {file.name}
              </a>
            ) : (
              <span className="break-all font-medium">{file.name}</span>
            )}
            <span className="text-small text-ink-secondary">
              {formatBytes(file.size_bytes)} · {file.uploader ? f.byOn(file.uploader, formatDate(file.created_at)) : formatDate(file.created_at)}
            </span>
          </div>
        </InsetRow>
      ))}
    </InsetGroupedList>
  );
}
