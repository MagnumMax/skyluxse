I will implement the requested "Save" and "Complete" logic for the driver task form, ensuring data is saved, status is updated, and saved data is visible upon returning.

### Changes to `components/driver-task-form.tsx`
1.  **Add Action Buttons**: Replace the single submit button with two distinct buttons:
    *   **Save Changes** (Secondary): Submits with `actionType="save"`.
    *   **Complete Task** (Primary): Submits with `actionType="complete"`.
2.  **Ensure Form Submission**: Verify that the form correctly sends the clicked button's value to the server action.

### Changes to `app/(driver)/driver/tasks/actions.ts`
1.  **Update `submitTaskInputs`**:
    *   Extract `actionType` from the `formData`.
    *   **Save Logic**: 
        *   Always process and save the form inputs (text, numbers, files).
        *   If `actionType` is `'save'` (or default), update the task status to `inprogress` (unless it's already `done`).
    *   **Complete Logic**:
        *   If `actionType` is `'complete'`, after saving inputs, call the `completeTask` logic to finalize the task (set status to `done`, sync services, etc.).
2.  **Data Persistence**: Ensure that the `upsert` operation correctly saves all input values so they are retrievable when the page is reloaded.
3.  **Feedback**: Ensure proper success/error messages are returned to the client.

This will resolve the "nothing happens" issue by ensuring a clear status update occurs on save, and satisfy the requirement for a separate completion workflow. The existing data fetching logic is already set up to display saved values (`defaultValue`s in the form), so successfully saving the data will ensure it appears when the task is opened later.