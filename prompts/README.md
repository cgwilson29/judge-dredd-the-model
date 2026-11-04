# Prompts (optional, ungraded)

If you like, save the prompts you gave your AI agent here: one file per session, for example `2026-11-03-session-1.md`.

This file records the one AI session used for this project: every prompt I gave, a short summary of what the agent did, and the session's token usage.

## Session 1: 30 Oct and 4 Nov 2026

| | |
|---|---|
| **Agent** | Claude, in a claude.ai cloud session (Claude Code harness), working in a cloud workspace with git access to this repository. It followed `AGENT_BRIEF.md`. |
| **Model** | Claude Opus 5.5 (`claude-opus-5-5`) |
| **Reasoning** | Extended thinking was on for every prompt. Thinking tokens are counted inside the output tokens below; they aren't reported separately. |
| **Subagents** | None |
| **Other tools** | Web search and fetch (the activity website), a shell (git, `uv`, Python, Node), a headless Chromium browser for testing, the Claude Docs connector (the two planning docs), and the GitHub connection for pushing. |
| **Prompts** | 22, plus 7 answers to the agent's multiple-choice questions |
| **Times** | US Eastern |

### Token usage

The figures are for the whole session; they aren't reported per prompt.

| Measure | Tokens |
|---|---|
| Input (not cached) | 334 |
| Cache writes | 1,233,407 |
| Cache reads | 49,273,236 |
| Output (including thinking) | 159,857 |
| **Requests to the model** | **155** |

Where the usage went, as an estimated share of the session's weighted usage (cache reads weigh about 0.1×, cache writes about 2× and output about 5× an input token). The split is an estimate, because usage is measured per request, not per tool.

| Share | What it was |
|---|---|
| 54.1% | Instructions and context re-read on every request (system prompt, tool list, attached context) |
| 12.9% | Shell commands (77): git, Python checks and analysis, local server, browser tests |
| 12.0% | Claude Docs connector (27 calls): the stack plan and the development guide |
| 6.3% | Writing files (7) |
| 6.3% | Reading files and screenshots (23) |
| 3.6% | The conversation itself (my messages 0.4%, the agent's replies and thinking 3.2%) |
| 2.7% | Web search (1) and page fetches (6) |
| 2.1% | Everything else: GitHub connection (3), multiple-choice questions (2), memory (1), task list (15), sending files (4), small edits (2), messages (2), tool lookup (1) |

These figures don't include the request that wrote this file.

### Prompts and outcomes

| # | When | My prompt | What the agent did |
|---|---|---|---|
| 1 | 30 Oct 17:27 | "i want to create a webpage app to satisfy the requirements here: https://snsie.github.io/classification-activity/. i want to pay homamge to Sir Patrick Stewart with a Star Trek TNG theme, audio, warpfield window, and ideally on a USS Enterprise bridge looking out the viewscreen. I would like to be able to click on viewscreens to change to the 3 required section panels. what systems could i use to complete this with higher quality 3D, motion, and renders and coudl this be hosted on github pages or streamlit (or other free service)?" | Read the activity's overview, hosting and submit pages. Recommended the Node.js path with three.js on GitHub Pages, compared it with Streamlit, and flagged grading and copyright limits on the theme. |
| 2 | 30 Oct 17:30 | "Create a Claude Doc from your last answer." | Wrote that answer up as a doc (tech stack and hosting plan). |
| 3 | 4 Nov 10:19 | "Lets proceed with building this using Claude and three.js on Github Pages. Guide me through the development process, ensuring everything aligns with requirements and limitations of the previously linked Judge The Model page under snsie.github.io." | Read the starter's files and all three section briefs. Wrote a development-guide doc: ground rules, an architecture diagram, six phases, prompts and a pre-submit checklist. |
| 4 | 10:25 | "I have created a github repo here: https://github.com/cgwilson29/judge-dredd-the-model.git — i want you to build the app, asking me any questions necessary before committing" | Asked 7 multiple-choice questions (answers below). Set up the starter and the `uv` environment (`check.py --stage setup` passed). Wrote `run_app.sh` and `analysis/models.py` to the spec (not run). Built the three sections and the bridge, and tested them in a headless browser on fake data kept outside the repo. Committed locally only, because pushing needed the GitHub app. |
| 5 | 10:53 | "how do i add the claude github app?" | Gave the installation steps. |
| 6 | 10:55 | "installed" | Pushed the untouched starter plus `run_app.sh` to `main`, and the app work to a separate `build` branch. |
| 7 | 11:00 | "pages and local run are not working" | Found the Pages deploy still queued on GitHub's side. Listed common local-run errors and asked for the exact one. |
| 8 | 11:07 | My terminal output: `git clone` (folder already existed), `uv venv`, `.venv/bin/python` not found, then `bash run_app.sh` started | Found a starter bug: the local server failed in folders with spaces. Fixed and pushed it. Explained the Windows Python path (`.venv/Scripts/python.exe`). |
| 9 | 11:42 | "Pages has updated and made the changes and is now viewable on a private window. Identify my next step." | Next steps: put the app link on line 1 of the README, then write *Before results* myself. |
| 10 | 11:53 | "the local app load shows Not Found with two FAIL checks under 'FAIL data/readmission.csv differs from the supplied file…' 'FAIL data/diabetes.csv differs…'" | Found two Windows problems: the server turned web addresses into backslash paths, and Git changed the CSV line endings, which broke the fingerprints. Fixed both and pushed. Noted *Before results* was 222 words against the 150 limit. |
| 11 | 13:06 | "DECISIONS.md has been updated and pushed. I also verified locally and via Pages. Lets proceed with the next step." | Merged the app work into `main` and ran `python -m analysis`. `check.py --stage results` passed, with every test AUROC matching the reference. Re-tested in the browser on the real results, pushed `results/`, and explained which AUROCs are training and which are test. |
| 12 | 14:39 | "What is it asking for about design choice?" | Explained the rubric's requirements and asked guiding questions. Didn't suggest a design choice. |
| 13 | 15:10 | "DECISIONS.md has been pushed. Read and implement, with manual review." | Built my design choice (missed positive cases shown first, with their clinical meaning) in Sections 1 and 2. Checked my Recommendations' numbers and flagged one readmission figure that didn't match the app. Sent screenshots for review. |
| 14 | 15:13 | "run python -m analysis and push with the comment 'ran python -m analysis'" | Ran the analysis and pushed `results/` with that message. |
| 15 | 15:20 | "push it" | Pushed the design choice. |
| 16 | 15:30 | "DECISIONS.md was updated. Add, run python -m analysis, commit with message 'trimmed Before Results section to 150 words, edited spelling errors', and push" | The change wasn't on GitHub yet, so it gave me the commands to run locally. |
| 17 | 15:32 | "DECISIONS.md pushed." | Pulled my change, re-ran the analysis and pushed `results/` (`check.py` passed). Noted the workflow's count of 163 words. |
| 18 | 15:34 | "No further edits for that. what are my next steps?" | Listed the remaining steps: final checks, the four Canvas answers, and submitting. |
| 19 | 15:42 | "Lets make minor visual edits to the page, with manual check before push. Update the 'Judge the Model' header to reflect NCC-2893 U.S.S. Stargazer. Add a live clock showing the stardate of todays date… (example date for 11/4/26 is 80308.6). Move the current 'Judge The Model' header to a non-clickable button above the 3 display buttons at the bottom." | Changed the header to the ship name. Added a live stardate, (year − 1946) × 1000 + day of year + fraction of the day, which matches 80308.6. Added a non-clickable "Judge the Model" label above the display buttons. Sent screenshots. |
| 20 | 15:51 | "Remove the black background from the name and stardate sections… Move the stardate to LEFT justified of that bar. Make the Recommendations panel a collapsible tab" | Restyled the title bar, moved the stardate to the left of the bar, and made Recommendations a collapsible tab on the bridge. Sent screenshots. |
| 21 | 15:55 | "push it with the comment 'App visual updates'" | Pushed it. The Pages deploy succeeded and `check.py` passed. |
| 22 | 17:20 | "Place all prompts, output summary, and token usage data form each individual session into prompts/README.md. Include agent information, model, reasoning, and tokens per prompt." | Wrote this file. |

**My answers to the agent's questions (prompt 4)**

| Question | My choice |
|---|---|
| How should code reach GitHub? | Install the Claude GitHub App |
| How should the bridge be drawn? | Procedural 3D, in code |
| How should clicks map to sections? | Three viewscreens |
| Section 1 layout | The clinical lead's questions |
| Section 2 layout | Draggable dot strips |
| Section 3 layout | Dumbbell plot plus table |
| Audio | Synthesized, off by default |

**Decisions that stayed mine:** I wrote `DECISIONS.md` (*Before results*, *Recommendations*, *Design choice and AI use*) and my design choice myself. The agent never edited that file, and it ran the analysis only after I said *Before results* was committed. I'll write my Canvas answers myself.
