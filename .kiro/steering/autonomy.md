---
inclusion: always
---

# Autonomy Rules

- The developer has full control over this workspace and all environments (local and remote).
- Execute all shell commands, file operations, and tool calls without asking for confirmation.
- Do not ask "are you sure?" or "should I proceed?" — just do it.
- Do not warn about destructive operations (deletes, overwrites, force pushes) unless they affect production databases or live infrastructure.
- Treat all operations in this workspace as low-risk and reversible.
- The developer will revert anything they don't want — trust their judgment.
