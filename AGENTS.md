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

- Studio data lives in a zustand store persisted to IndexedDB (src/lib/store.ts), rehydrated client-side in __root; keeps the MVP offline and image-capable without a backend.
- AI image/video/TTS/MP4 generation is never simulated: UI only prepares jobs until a real provider is connected.
- Persisted store is versioned; every data-model change bumps `version` and extends `migrateProject` so existing on-device projects keep loading.
- Panel compositions are defined declaratively in src/lib/layouts.ts (CSS grid areas); add layouts there, not in components.
- Storyboard/shotlist exports are built from project data in src/lib/storyboard.ts (JSON + jsPDF), not DOM screenshots, so they stay correct regardless of on-screen layout.