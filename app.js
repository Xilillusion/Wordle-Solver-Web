const SOLVERS = [
  "Bayesian",
  "Binary",
  "Greedy",
  "LimitBayesian",
  "LimitMinimax",
  "Minimax",
];
const COLORS = ["gray", "yellow", "green"];
const COLOR_VALUES = { gray: 0, yellow: 1, green: 2 };
const WIN_RESULT = 242;
const treeDirectory = new URL("./trees/", document.currentScript.src);

const solverSelect = document.querySelector("#solver");
const startButton = document.querySelector("#start");
const submitButton = document.querySelector("#submit");
const attemptLabel = document.querySelector("#attempt");
const guessContainer = document.querySelector("#guess");
const statusLabel = document.querySelector("#status");

let currentNode = null;
let attempt = 0;
let finished = false;

function setStatus(message, kind = "") {
  statusLabel.textContent = message;
  statusLabel.className = `status ${kind}`.trim();
}

function isTreeNode(node) {
  return node !== null
    && typeof node === "object"
    && typeof node.guess === "string"
    && /^[A-Z]{5}$/.test(node.guess)
    && node.children !== null
    && typeof node.children === "object"
    && !Array.isArray(node.children);
}

function feedbackResult() {
  return [...guessContainer.querySelectorAll(".tile")].reduce(
    (result, tile, index) => result + COLOR_VALUES[tile.dataset.color] * (3 ** index),
    0,
  );
}

function renderGuess(guess) {
  guessContainer.replaceChildren();
  for (let index = 0; index < guess.length; index += 1) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile gray";
    tile.textContent = guess[index];
    tile.dataset.color = "gray";
    tile.setAttribute("aria-label", `Position ${index + 1}: gray`);
    tile.addEventListener("click", () => {
      const nextColor = COLORS[(COLORS.indexOf(tile.dataset.color) + 1) % COLORS.length];
      tile.dataset.color = nextColor;
      tile.className = `tile ${nextColor}`;
      tile.setAttribute("aria-label", `Position ${index + 1}: ${nextColor}`);
    });
    guessContainer.append(tile);
  }
}

async function startGame() {
  startButton.disabled = true;
  submitButton.disabled = true;
  setStatus("Loading saved decision tree...");
  attemptLabel.textContent = "Loading...";
  guessContainer.replaceChildren();
  currentNode = null;
  attempt = 0;
  finished = false;

  try {
    const solver = solverSelect.value;
    if (!SOLVERS.includes(solver)) {
      throw new Error("That decision tree is not available.");
    }
    if (window.location.protocol === "file:") {
      throw new Error(
        "Browsers cannot fetch decision trees when this page is opened directly. Start a local web server and open the app over HTTP (see README).",
      );
    }

    const response = await fetch(new URL(`${solver}.json`, treeDirectory));
    if (!response.ok) {
      throw new Error(`Could not load ${solver}.json (HTTP ${response.status}).`);
    }

    const tree = await response.json();
    if (!isTreeNode(tree)) {
      throw new Error(`${solver}.json does not contain a valid decision tree.`);
    }

    currentNode = tree;
    attempt = 1;
    renderCurrentNode();
    setStatus(`Using the saved ${solver} tree.`);
  } catch (error) {
    attemptLabel.textContent = "Could not start the game.";
    const message = error instanceof TypeError
      ? `Could not fetch the decision tree. Check the server connection and try again. (${error.message})`
      : error.message;
    setStatus(message, "error");
  } finally {
    startButton.disabled = false;
  }
}

function renderCurrentNode() {
  if (!isTreeNode(currentNode)) {
    throw new Error("The saved tree contains an invalid guess or branch.");
  }
  attemptLabel.textContent = attempt <= 6 ? `Attempt ${attempt} of 6` : `Attempt ${attempt} (past 6)`;
  renderGuess(currentNode.guess);
  submitButton.disabled = finished;
}

function submitFeedback() {
  if (currentNode === null || finished) {
    return;
  }

  const result = feedbackResult();
  if (result === WIN_RESULT) {
    finished = true;
    submitButton.disabled = true;
    attemptLabel.textContent = `Solved in ${attempt} ${attempt === 1 ? "guess" : "guesses"}!`;
    setStatus("Nice work!", "success");
    return;
  }

  const nextNode = currentNode.children[String(result)];
  if (nextNode === undefined) {
    setStatus(
      `The ${solverSelect.value} tree has no saved branch for this feedback. This site does not calculate missing guesses.`,
      "error",
    );
    return;
  }
  if (!isTreeNode(nextNode)) {
    setStatus("The saved tree contains an invalid branch.", "error");
    return;
  }

  currentNode = nextNode;
  attempt += 1;
  try {
    renderCurrentNode();
    setStatus("");
  } catch (error) {
    submitButton.disabled = true;
    setStatus(error.message, "error");
  }
}

startButton.addEventListener("click", startGame);
submitButton.addEventListener("click", submitFeedback);
