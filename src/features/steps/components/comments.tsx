import { ActionForm, Checkbox, TextArea } from "@/components/form";
import { Tag } from "@/components/ds/tag";
import { addCommentAction } from "@/features/steps/actions";
import { formatDateTime, formatRelative } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const c = t.client.comments;

export type ThreadComment = {
  id: string;
  body: string;
  created_at: string;
  internal?: boolean;
  author: { name: string; isYou: boolean; isStudio: boolean };
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("nb"))
    .join("") || "?";

// Like document comments: initials, name, time, text; no speech bubbles. The input sits at
// the bottom and grows as you type (DESIGN.md, Comments). Shared by client and studio.
export function CommentThread({
  comments,
  target,
  allowInternal = false,
  headingLevel = 2,
}: {
  comments: ThreadComment[];
  target: { stepId?: string; changeRequestId?: string };
  allowInternal?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <Heading id="comments-heading" className={headingLevel === 2 ? "text-title-l" : "text-title-m"}>
        {c.heading}
      </Heading>
      {comments.length === 0 ? (
        <p className="text-ink-secondary">{c.empty}</p>
      ) : (
        <ol className="flex flex-col">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 border-b border-hairline py-4 last:border-b-0">
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-sm text-label ${comment.author.isStudio ? "bg-slate-bg text-slate-fg" : "bg-subtle text-ink"}`}
              >
                {initials(comment.author.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-label">{comment.author.name}</span>
                  <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)} className="text-small text-ink-secondary">
                    {formatRelative(comment.created_at)}
                  </time>
                  {comment.internal && <Tag tone="amber">{t.studio.step.internalBadge}</Tag>}
                </p>
                <p className="mt-1 whitespace-pre-line text-body">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ActionForm action={addCommentAction.bind(null, target)} submitLabel={c.submit} pendingLabel={t.forms.submitting} submitVariant="secondary" className="flex flex-col gap-3">
        <TextArea label={c.label} name="body" rows={2} grow required />
        {allowInternal && <Checkbox label={t.studio.step.internal} name="internal" />}
      </ActionForm>
    </section>
  );
}
