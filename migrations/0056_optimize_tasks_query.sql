-- Optimize tasks query by adding index on deadline_at
CREATE INDEX IF NOT EXISTS idx_tasks_deadline_at ON tasks(deadline_at);

-- Optimize task_required_input_values joins
CREATE INDEX IF NOT EXISTS idx_task_inputs_task_id ON task_required_input_values(task_id);
