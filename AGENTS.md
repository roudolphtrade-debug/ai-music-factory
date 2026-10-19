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

- Keep chart tracks in the shared playback lookup under existing identifiers so favorites and history remain resolvable without migration.
- Keep homepage editorial translations in a browser-safe six-language catalog so scoped additions stay isolated from unrelated screens.
- Scope compact chrome through homepage presentation props; preserve audio state and other pages' layouts.
- Keep the discovery Bento and functional font experiment scoped to homepage presentation; reuse shared playback and destination controls to avoid changing other screens or persistence.
- Keep queue ordering, shuffle and repeat rules in pure helpers (src/audio/queue.ts) used by the player, so they stay unit-tested independently of audio events.
- Keep player, Radio and Library strings in a separate browser-safe six-language listening catalog so these screens evolve without touching the main dictionary.

- Keep global language selector presentation in its dedicated layout component using the existing I18n provider and Radix radio menu; this isolates header styling from translations, persistence and other global controls.
