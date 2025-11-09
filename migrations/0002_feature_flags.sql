-- 2025-11-09: Extend system feature flags for AI & telemetry stubs

insert into public.system_feature_flags(flag, is_enabled, description) values
  ('enableAiCopilot', false, 'Turns on AI lead copilot + SLA nudges'),
  ('enableTelemetryPipelines', false, 'Turns on external telemetry + Slack routing')
on conflict (flag) do nothing;
