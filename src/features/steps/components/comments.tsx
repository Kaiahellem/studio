import { ActionForm, Checkbox, TextArea } from "@/components/form";
import { Badge } from "@/components/ui";
import { addCommentAction } from "@/features/steps/actions";
import { formatDateTime } from "@/lib/format/date";
import { t } from "@/i18n/nb";

const c = t.client.comments;

export type ThreadComment = {
  id: string;
  body: string;
  created_at: string;
  internal?: boolean;
  author: { name: string; isYou: boolean; isStudio: boolean };
};

// Questions stay in the hub instead of SMS (BRIEF.md). Shared by the client and the studio.
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
    <section aria-labelledby="comments-heading" className="flex flex-col gap-6">
      <Heading id="comments-heading" className="font-serif text-2xl">
        {c.heading}
      </Heading>
      {comments.length === 0 ? (
        <p className="text-muted">{c.empty}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={`rounded-lg border p-4 ${comment.internal ? "border-dashed border-field-border bg-paper" : "border-line bg-surface"} ${
                comment.author.isYou ? "sm:ml-12" : "sm:mr-12"
              }`}
            >
              <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{comment.author.name}</span>
                <span className="text-muted">· {formatDateTime(comment.created_at)}</span>
                {comment.internal && <Badge tone="muted">{t.studio.step.internalBadge}</Badge>}
              </p>
              <p className="whitespace-pre-line leading-relaxed">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}
      <ActionForm action={addCommentAction.bind(null, target)} submitLabel={c.submit} pendingLabel={t.forms.submitting}>
        <TextArea label={c.label} name="body" rows={3} required />
        {allowInternal && <Checkbox label={t.studio.step.internal} name="internal" />}
      </ActionForm>
    </section>
  );
}
