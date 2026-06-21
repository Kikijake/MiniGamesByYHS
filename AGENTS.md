# Opencode-Tester

Minimal repo for testing OpenCode tooling and agents.

## Agents

All defined in `.opencode/agents/`:

| Agent | Mode | Model | Role |
|---|---|---|---|
| `core` | primary | `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` | Entry point, delegates to researcher/solutions_architect |
| `researcher` | primary | `opencode/deepseek-v4-flash-free` | Codebase analysis and research |
| `solutions_architect` | primary | `opencode/deepseek-v4-flash-free` | Planning and task breakdown |
| `lead_developer` | subagent | (inherits) | Writes code |
| `qa_engineer` | subagent | (inherits) | Runs tests and validation |

No build system or dependencies.
