<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use TanStack file routes with shared news presentation components; retain the supplied public URL shapes so every language and article is independently shareable.
- Store newsroom records in Lovable Cloud and enforce publishing roles in database policies and authenticated server functions; never expose internal notes or pending edits publicly.
- Keep news photos in a private bucket and serve only published references through signed URLs because workspace policy forbids public buckets.
- Determine scheduled story visibility from publish_at on every public read, avoiding recurring polling while retaining on-time publication.
- Sanitize article HTML in server saves and reads with an explicit allowlist; rich text editing uses TipTap.
- Citizen submissions never touch the database directly from the browser: inserts go through a server function using the admin client, and the public may read a case only with its reference number plus secret code.
- Submitter contact details live in a separate query_contacts table and evidence in the private citizen-evidence bucket, both readable only by moderator-capable roles, because contact and evidence must never leak to other newsroom roles or the public.
- The home-page ticker is derived from published videos/posts at read time (no ticker_items table), matching the scheduled-visibility rule of no polling jobs.
- Approved site imagery reuses the private news-media bucket with signed URLs; no public bucket exists because workspace policy forbids them.
