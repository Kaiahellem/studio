import { ActionButton } from "@/components/form";
import { removeUploadAction } from "@/features/steps/actions";
import { formatDate } from "@/lib/format/nb";
import { formatBytes } from "@/lib/format/file";
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

export function FileList({ files, empty = f.empty }: { files: ListedFile[]; empty?: string }) {
  if (files.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {files.map((file) => (
        <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {file.url ? (
              <a href={file.url} className="break-all font-medium underline-offset-4 hover:underline" download={file.name}>
                {file.name}
              </a>
            ) : (
              <span className="break-all font-medium">{file.name}</span>
            )}
            <p className="text-sm text-muted">
              {formatBytes(file.size_bytes)} · {file.uploader ? f.byOn(file.uploader, formatDate(file.created_at)) : formatDate(file.created_at)}
            </p>
          </div>
          {file.removable && (
            <ActionButton
              action={removeUploadAction.bind(null, file.id)}
              label={t.common.remove}
              ariaLabel={t.client.upload.remove(file.name)}
              variant="danger"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
