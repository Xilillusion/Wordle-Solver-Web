# Wordle Solver Web

A browser-based Wordle assistant that follows precomputed decision trees. Choose a solver, start a game, and click each letter tile to match Wordle's gray, yellow, or green feedback. Submit the feedback to get the next saved guess.

The app does not calculate missing guesses: it follows the selected JSON tree in [`trees/`](./trees/). The selector scans the `trees/` directory listing and automatically includes JSON files named `ModelName-score.json`. Each tree uses a two-item array for each node: the guess followed by an object mapping feedback results to child nodes. Models are ordered by the numeric score in their filename. The web server must allow directory listings for `trees/`.

## Run locally

The browser must load the decision tree files over HTTP. Do not open `index.html` directly as a `file://` URL.

From the project directory, start Python's built-in web server:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser. Stop the server with `Ctrl+C`.

## Projects

- Decision-tree generators and solver details: [Xilillusion/Wordle-Solver: Bayesian, Minimax and Heuristic solvers for Wordle](https://github.com/Xilillusion/Wordle-Solver)
- This web app: [Xilillusion/Wordle-Solver-Web](https://github.com/Xilillusion/Wordle-Solver-Web)
