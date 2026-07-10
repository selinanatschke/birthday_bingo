const BOARD_SIZE = 25;
const STORAGE_KEY = "birthday-bingo-state";

const boardElement = document.getElementById("board");
const errorElement = document.getElementById("error");

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Konnte ${path} nicht laden (${response.status})`);
  }

  return response.json();
}

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getBoardTemplates(questions) {
  if (!Array.isArray(questions) || questions.length < BOARD_SIZE) {
    throw new Error(`Mindestens ${BOARD_SIZE} Fragen werden benoetigt.`);
  }

  return shuffle(questions).slice(0, BOARD_SIZE);
}

function assignNames(templates, names) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("Die Namensliste ist leer.");
  }

  const shuffledNames = shuffle(names);

  return templates.map((template, index) => {
    const name = shuffledNames[index % shuffledNames.length];
    return template.replaceAll("{{name}}", name);
  });
}

function createDataSignature(questions, names) {
  return JSON.stringify({ questions, names });
}

function createEmptyProgress() {
  return Array(BOARD_SIZE).fill(false);
}

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.fields) ||
      parsed.fields.length !== BOARD_SIZE ||
      !Array.isArray(parsed.progress) ||
      parsed.progress.length !== BOARD_SIZE ||
      typeof parsed.signature !== "string"
    ) {
      return null;
    }

    return {
      signature: parsed.signature,
      fields: parsed.fields.map(String),
      progress: parsed.progress.map(Boolean),
    };
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getBoardState(questions, names) {
  const signature = createDataSignature(questions, names);
  const storedState = loadStoredState();

  if (storedState && storedState.signature === signature) {
    return storedState;
  }

  const templates = getBoardTemplates(questions);
  const fields = assignNames(templates, names);

  return {
    signature,
    fields,
    progress: createEmptyProgress(),
  };
}

function renderBoard(fields, progress) {
  boardElement.innerHTML = "";

  fields.forEach((field, index) => {
    const tile = document.createElement("button");
    const isChecked = progress[index];

    tile.type = "button";
    tile.className = `tile${isChecked ? " is-checked" : ""}`;
    tile.setAttribute("aria-pressed", String(isChecked));
    tile.textContent = field;

    tile.addEventListener("click", () => {
      progress[index] = !progress[index];
      saveState({
        signature: currentState.signature,
        fields,
        progress,
      });
      renderBoard(fields, progress);
    });

    boardElement.appendChild(tile);
  });
}

function showError(message) {
  errorElement.hidden = false;
  errorElement.textContent = message;
}

let currentState = null;

async function init() {
  try {
    const [questions, names] = await Promise.all([
      loadJson("./data/questions.json"),
      loadJson("./data/names.json"),
    ]);

    currentState = getBoardState(questions, names);
    saveState(currentState);

    renderBoard(currentState.fields, currentState.progress);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    showError(`${message}. Starte die Seite ueber einen lokalen Webserver, nicht direkt per file://.`);
  }
}

init();
