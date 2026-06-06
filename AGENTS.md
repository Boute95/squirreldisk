# Project Overview
This is a Tauri desktop application (Rust backend + React frontend) for visualizing disk usage with a treemap interface.

# Agent Guidelines for TamiaDisk

## Rust Compilation
- **`cargo check` is allowed** — use it freely for quick syntax/type checking during development.
- **Do NOT run `cargo build`.** Full builds are slow and will be tested manually by the developer.
- Also avoid: `cargo clippy`, `cargo test`, `npm run tauri build` unless explicitly requested.


### Structure
- `src-tauri/` — Rust/Tauri backend
  - `src/main.rs` — Entry point, Tauri commands
  - `src/scan.rs` — Disk scanning logic (sidecar invocation)
  - `Cargo.toml` — Dependencies
- `src/` — React frontend
  - `App.tsx` — Router and layout
  - `components/DiskDetail.tsx` — Main disk view with treemap
  - `components/ToolBar.tsx` — Navigation toolbar
  - `components/FileLine.tsx` — File list items
  - `components/FileContextMenu.tsx` — Context menu
  - `pruneData.ts` — Tree data utilities

### Key Technologies
- **Frontend:** React, TypeScript, Ant Design, @nivo/treemap, react-beautiful-dnd
- **Backend:** Tauri v2, Rust, sysinfo, walkdir, trash crate
- **Styling:** Tailwind CSS via classes
