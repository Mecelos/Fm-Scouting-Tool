# FM27 Scout Lab

A browser scouting tool for Football Manager 27. It reads FM saves and exports and shows
players, stats, squad, tactics, staff and scouting pages. The finished tool is ONE html file,
which is opened in a browser or published as a Claude artifact.

## How this project is laid out

- `src/` holds the tool as small files. This is the only place to make changes.
- `src/index.html` is the page skeleton and lists every file in the order it is joined.
- `python build.py` joins everything into `dist/fm27-scout-lab.html`.
- `PROJECT_MAP.md` says what every file does. Read it first to find the right file.

## Rules for changing the code

- Read `PROJECT_MAP.md` first and open only the files you need. Do not read the whole project.
- Never read `src/data/*.csv` or `src/save-reader/01-fzstd-library.js`. They are large and are not app code.
- Never edit `dist/` or `fm27-scout-lab-v58.html` directly. Edit `src/`, then run `python build.py`.
- Run `python build.py` after every change, and fix any error or warning it prints.
- A new file must be added to `src/index.html` in the right place, and to `PROJECT_MAP.md`.
- Files in `src/app/` are joined in order into one script and share one scope. Do not add
  `import`/`export` or wrap files in their own function.
- Files in `src/save-reader/` are pieces of one block and are included twice by the build.
  Edit them normally; do not copy their code anywhere else.
- Keep files under about 400 lines. Split a file that grows past that, at a section comment.
- After a change, check the build still loads: open `dist/fm27-scout-lab.html` in a browser.

## Working with the owner

- The owner does not read code. After every change, explain what you did in 2 or 3 plain-English lines.
- Before any change bigger than a few lines, show a short plan first.
- After each change that works, remind the owner to make a Git save point.

## Using Qwen (the ask_qwen tool), when it is available

- Send to Qwen: simple self-contained functions, boilerplate, comments, documentation, test data, file summaries.
- Keep for yourself: debugging, anything touching several files, design decisions, anything involving security or user data.
- Give Qwen one small job at a time with everything it needs in the message. It cannot see the project.
- Always review Qwen's answer before saving it. If Qwen gets a job wrong twice, do it yourself.
- At the end of each task, say which parts Qwen did.
