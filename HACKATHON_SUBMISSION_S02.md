# TestSprite Season 2 Submission Checklist

This file is a submission-ready checklist based on the published Season 2 rules.

## Required

- [x] Public project codebase exists.
- [x] `testsprite_tests/` folder exists with generated test files.
- [x] `README.md` exists and explains the project.
- [ ] Repo is public on GitHub (manual check in GitHub settings).
- [ ] Two rounds of TestSprite testing completed and kept as evidence.
- [ ] Submission posted in Discord channel `#hackathon-s02-submission` before deadline.

## Bonus (Recommended)

- [ ] `demo.mp4` added at repo root for judging bonus points.
- [x] External demo link present in README.
- [ ] Share best test result on X and post link in Discord bonus channel.

## Secret Safety Before Public Submission

- [x] `.env` is gitignored.
- [x] `.vscode/mcp.json` is gitignored.
- [x] `.cursor/mcp.json` is gitignored.
- [x] `testsprite_tests/tmp/config.json` is gitignored.
- [ ] Rotate any API keys previously used locally (recommended before public launch).

## Suggested Evidence to Keep in Repo

- `testsprite_tests/testsprite_frontend_test_plan.json`
- `testsprite_tests/testsprite_backend_test_plan.json`
- `testsprite_tests/TC*.py`
- Optional summary notes in README (testing approach + what was fixed).

## Discord Submission Template

Project: PolyDub

Repo: <your-public-github-repo-url>

What I built:
- Real-time multilingual communication and dubbing platform (broadcast, rooms, VOD).

Testing with TestSprite:
- Round 1: Generated and executed frontend/backend tests via TestSprite MCP.
- Round 2: Fixed failures and re-ran to improve pass rate.

Highlights:
- AI-generated test coverage for API and user flows.
- Backend compatibility fixes for robust request/response handling.

Demo:
- Video: <optional demo.mp4 or YouTube link>
