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
let models = [];
let attempt = 0;
let finished = false;

function setStatus(message, isError = false) {
  statusLabel.textContent = message;
  statusLabel.classList.toggle("error", isError);
}

function errorMessage(error) {
  if (error instanceof TypeError) {
    return `Could not fetch saved model data. Check the server connection and try again. (${error.message})`;
  }
  return error instanceof Error ? error.message : String(error);
}

function isTreeNode(node) {
  return Array.isArray(node)
    && node.length === 2
    && typeof node[0] === "string"
    && /^[A-Z]{5}$/.test(node[0])
    && node[1] !== null
    && typeof node[1] === "object"
    && !Array.isArray(node[1]);
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

async function loadModels() {
  if (window.location.protocol === "file:") {
    throw new Error(
      "Browsers cannot fetch decision trees when this page is opened directly. Start a local web server and open the app over HTTP (see README).",
    );
  }

  const response = await fetch(treeDirectory);
  if (!response.ok) {
    throw new Error(`Could not list decision trees (HTTP ${response.status}).`);
  }

  const listing = new DOMParser().parseFromString(await response.text(), "text/html");
  const models = new Map();
  for (const link of listing.querySelectorAll("a[href]")) {
    const url = new URL(link.getAttribute("href"), response.url);
    if (url.origin !== treeDirectory.origin || !url.pathname.startsWith(treeDirectory.pathname)) {
      continue;
    }

    const file = url.pathname.slice(treeDirectory.pathname.length);
    const match = file.match(/^([A-Za-z0-9]+)-([0-9]+(?:\.[0-9]+)?)\.json$/);
    if (match) {
      models.set(file, { name: match[1], file, score: Number(match[2]) });
    }
  }

  return [...models.values()].sort(
    (left, right) => left.score - right.score || left.name.localeCompare(right.name),
  );
}

async function loadTree(model) {
  const response = await fetch(new URL(model.file, treeDirectory));
  if (!response.ok) {
    throw new Error(`Could not load ${model.file} (HTTP ${response.status}).`);
  }

  const tree = await response.json();
  if (!isTreeNode(tree)) {
    throw new Error(`${model.file} does not contain a valid decision tree.`);
  }
  return tree;
}

async function initializeModels() {
  try {
    models = await loadModels();
    if (models.length === 0) {
      throw new Error("The trees/ directory does not contain any decision tree files.");
    }

    solverSelect.replaceChildren();
    for (const model of models) {
      const option = document.createElement("option");
      option.value = model.file;
      option.textContent = `${model.name} (${model.score})`;
      solverSelect.append(option);
    }
    solverSelect.disabled = false;
  } catch (error) {
    setStatus(errorMessage(error), true);
  }
}

async function startGame() {
  startButton.disabled = true;
  submitButton.disabled = true;
  setStatus("");

  try {
    const model = models.find(({ file }) => file === solverSelect.value);
    if (!model) {
      throw new Error("Select an available decision tree.");
    }
    currentNode = await loadTree(model);
    activeSolver = model.name;
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
  renderGuess(currentNode[0]);
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

  const nextNode = currentNode[1][String(result)];
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
initializeModels();
