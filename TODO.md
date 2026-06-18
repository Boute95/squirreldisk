1. [ ] Implement trash functionality
    1. [x] Add a trash navigation button in the ToolBar (next to Folder Up) to navigate to the disk's trash folder
       - Icon suggestion: `MdDelete` or `FaTrash`
    2. [x] Clicking the trash button sets `DiskDetail`'s `focusedPath` to the disk's trash folder path (platform-dependent), navigating the treemap there — no dedicated route or separate view, just standard folder navigation
    3. [x] When inside the trash (either from ToolBar button or navigating via treemap), show in the ToolBar:
       - A `|` divider separating navigation actions from trash actions
       - "Restore" button to restore the selected/current trashed item
       - "Empty trash" button (danger style) to permanently delete all trashed items
    4. [x] Backend: use the `trash` Rust crate to resolve the platform-dependent trash folder path, and add `empty_trash` and per-item `restore_from_trash` Tauri commands (listing uses normal directory reading since the trash is just a folder on the disk)
    5. [x] ToolBar should accept props like `inTrash?: boolean`, `onRestore?: () => void`, `onEmptyTrash?: () => void` to conditionally render trash action buttons
    6. [ ] move_to_trash in main.rs should show print a message if success or error, using the result or error message from the trash::delete call.
    7. [ ] Do the same as 6 but for other trash functions.
