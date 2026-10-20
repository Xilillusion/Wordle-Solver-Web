const SOLVERS = new Set([
  "Bayesian",
  "Binary",
  "Greedy",
  "LimitBayesian",
  "LimitMinimax",
  "Minimax",
]);
const FEEDBACK_COLORS = ["gray", "yellow", "green"];
const FEEDBACK_VALUES = { gray: 0, yellow: 1, green: 2 };
const WIN_RESULT = 242;
const treeDirectory = new URL("./trees/", document.currentScript.src);

const solverSelect = document.querySelector("#solver");
const startButton = document.querySelector("#start");
const submitButton = document.querySelector("#submit");
const attemptLabel = document.querySelector("#attempt");
const guessContainer = document.querySelector("#guess");
const statusLabel = document.querySelector("#status");

let currentNode = null;
let activeSolver = null;
let attempt = 0;
let finished = false;

function setStatus(message, isError = false) {
  statusLabel.textContent = message;
  statusLabel.classList.toggle("error", isError);
}

function errorMessage(error) {
  if (error instanceof TypeError) {
    return `Could not fetch the decision tree. Check the server connection and try again. (${error.message})`;
  }
  return error instanceof Error ? error.message : String(error);
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
    (result, tile, index) => result + FEEDBACK_VALUES[tile.dataset.color] * (3 ** index),
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
    updateTileLabel(tile, index);
    guessContainer.append(tile);
  }
}

function updateTileLabel(tile, index) {
  tile.setAttribute("aria-label", `Position ${index + 1}: ${tile.dataset.color}`);
}

function cycleTileColor(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const tile = event.target.closest(".tile");
  if (!(tile instanceof HTMLButtonElement)) {
    return;
  }

  const colorIndex = FEEDBACK_COLORS.indexOf(tile.dataset.color);
  const nextColor = FEEDBACK_COLORS[(colorIndex + 1) % FEEDBACK_COLORS.length];
  tile.dataset.color = nextColor;
  tile.className = `tile ${nextColor}`;
  updateTileLabel(tile, [...guessContainer.children].indexOf(tile));
}

async function loadTree(solver) {
  if (!SOLVERS.has(solver)) {
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
  return tree;
}

async function startGame() {
  startButton.disabled = true;
  submitButton.disabled = true;
  setStatus("");

  try {
    const solver = solverSelect.value;
    currentNode = await loadTree(solver);
    activeSolver = solver;
    attempt = 1;
    finished = false;
    renderCurrentNode();
  } catch (error) {
    setStatus(errorMessage(error), true);
  } finally {
    startButton.disabled = false;
    submitButton.disabled = currentNode === null || finished;
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
    return;
  }

  const nextNode = currentNode.children[String(result)];
  if (nextNode === undefined) {
    setStatus(`The ${activeSolver} tree has no saved branch for this feedback. This site does not calculate missing guesses.`, true);
    return;
  }
  if (!isTreeNode(nextNode)) {
    setStatus("The saved tree contains an invalid branch.", true);
    return;
  }

  currentNode = nextNode;
  attempt += 1;
  renderCurrentNode();
  setStatus("");
}

guessContainer.addEventListener("click", cycleTileColor);
startButton.addEventListener("click", startGame);
submitButton.addEventListener("click", submitFeedback);
