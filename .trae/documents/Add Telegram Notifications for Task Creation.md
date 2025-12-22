I will add Telegram notifications for all task creations by implementing a shared notification helper and integrating it into the API and scripts where tasks are created.

### 1. Create Notification Helper
Create `lib/notifications/task-notifications.ts` to handle fetching task details and sending the Telegram message.
- **Function:** `sendTaskCreatedNotification(taskId: string, supabase: SupabaseClient)`
- **Logic:**
  - Fetches task details including related Booking, Vehicle, and Client.
  - Formats a Telegram-friendly HTML message with emojis and key details.
  - Calls the existing `sendNotification` utility.

### 2. Integrate into API
Modify `app/api/tasks/create/route.ts` to trigger the notification.
- **Change:** Import `sendTaskCreatedNotification` and call it immediately after a task is successfully inserted.

### 3. Integrate into Scripts
Modify the existing scripts that create tasks to also trigger notifications.
- **`scripts/create-driver-tasks.ts`**: Update `upsertTask` to return the task ID and call `sendTaskCreatedNotification` when a new task is created.
- **`scripts/create-pickup-task.ts`**: Call `sendTaskCreatedNotification` after the task insertion.

### 4. Verification
- Since I cannot run the scripts against the production DB safely without specific inputs, I will verify by:
  - Checking the code for type safety and correct imports.
  - Ensuring the `sendNotification` call uses the correct channel ('telegram').
  - Verifying that the notification logic is wrapped in error handling to prevent blocking the main task creation flow.
