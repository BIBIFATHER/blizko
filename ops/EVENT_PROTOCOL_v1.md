# EVENT_PROTOCOL v1
Если нет события — ничего не произошло.

## Формат события (append-only)
{
  "event_id": "uuid",
  "ts": "ISO8601",
  "type": "event_type",
  "agent_id": "agent_name",
  "task_id": "TASK-XXX|null",
  "payload": {},
  "note": "optional"
}

## Типы событий
Task:
— task_created, task_assigned, task_started, task_progress
— task_blocked, task_unblocked
— task_needs_review, task_done
Governance:
— change_request_created, change_request_approved, change_request_rejected
Security:
— security_violation_detected
Agent:
— agent_heartbeat, agent_state_changed

## Mapping статусов
task_created → Backlog
task_assigned → Ready
task_started → InProgress
task_blocked → Blocked
task_needs_review → Review
task_done → Done
