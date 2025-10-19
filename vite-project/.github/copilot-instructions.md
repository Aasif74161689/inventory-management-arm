# Copilot Instructions for inventory-management-arm/vite-project

## Project Overview

- **Architecture:** React (JSX) frontend using Vite for fast builds and HMR. State and data flows are managed via React hooks and context. Inventory data is persisted and updated via Firebase integration (`src/firebaseService.js`).
- **Key Directories:**
  - `src/components/`: All major UI components and modals (e.g., `BulkStockUpdateModal.jsx`, `Inventory.jsx`, `UserManagementModal.jsx`).
  - `src/data/`: Static data and JSON files for inventory and BOMs.
  - `src/firebaseService.js`: Centralized service for Firebase CRUD operations.

## Developer Workflows

- **Start Dev Server:**
  - `npm run dev` (Vite HMR, React Fast Refresh)
- **Build for Production:**
  - `npm run build`
- **Linting:**
  - `npm run lint` (uses ESLint config in `eslint.config.js`)
- **No formal test suite detected.**

## Patterns & Conventions

- **Inventory Updates:**
  - Use modals (e.g., `BulkStockUpdateModal.jsx`) for batch updates. Always preview changes before saving. Log all changes with timestamps and action details in the `logs` array.
  - Inventory state is updated locally and then persisted via `updateInventory` (Firebase).
- **Component Structure:**
  - Components are function-based, using hooks (`useState`, `useEffect`).
  - Props are used for data and callbacks; avoid global state except for Firebase.
- **Data Flow:**
  - Inventory and BOM data are loaded from JSON or Firebase, then passed down via props.
  - All updates should be reflected in both local state and remote (Firebase) store.
- **Error Handling:**
  - Log errors to console. No user-facing error UI by default.
- **Styling:**
  - Uses Tailwind CSS utility classes in JSX for layout and style.

## Integration Points

- **Firebase:**
  - All inventory CRUD operations go through `src/firebaseService.js`. Use `updateInventory` for updates.
- **Vite Plugins:**
  - React plugin for HMR and Fast Refresh. No custom Vite plugins detected.

## Examples

- **Bulk Inventory Update:** See `BulkStockUpdateModal.jsx` for preview/save pattern and logging.
- **Component Communication:** Props for state/data, callbacks for actions (e.g., `onClose`, `setInventory`).

## Recommendations for AI Agents

- Follow the preview-confirm-save pattern for any batch updates.
- Always update both local state and Firebase when modifying inventory.
- Use Tailwind CSS classes for UI consistency.
- Reference `src/components/` for reusable UI patterns.
- Log all inventory changes with timestamp and action details.

---

_If any conventions or workflows are unclear, please ask for clarification or examples from the codebase._
