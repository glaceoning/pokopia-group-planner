const HABITAT_INCOMPATIBLE = new Set([
  "bright|dark",
  "dark|bright",
  "humid|dry",
  "dry|humid",
  "warm|cool",
  "cool|warm",
]);

const state = {
  pokemon: [],
  sortedPokemon: [],
  pokemonById: new Map(),
  groupIds: [],
};

const elements = {
  pokemonSearch: document.querySelector("#pokemonSearch"),
  pokemonSelect: document.querySelector("#pokemonSelect"),
  addPokemon: document.querySelector("#addPokemon"),
  clearGroup: document.querySelector("#clearGroup"),
  groupList: document.querySelector("#groupList"),
  groupHint: document.querySelector("#groupHint"),
  requiredHabitat: document.querySelector("#requiredHabitat"),
  requiredSpecialtiesBox: document.querySelector("#requiredSpecialtiesBox"),
  clearSpecialties: document.querySelector("#clearSpecialties"),
  specialtiesHint: document.querySelector("#specialtiesHint"),
  importanceRatio: document.querySelector("#importanceRatio"),
  importanceValue: document.querySelector("#importanceValue"),
  resultCount: document.querySelector("#resultCount"),
  recommend: document.querySelector("#recommend"),
  resultsBody: document.querySelector("#resultsBody"),
  status: document.querySelector("#status"),
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const clean = String(value ?? "").trim();
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function setFrom(values) {
  return new Set(values.map(normalizeText).filter(Boolean));
}

function listToText(values) {
  return values.length ? values.join(", ") : "-";
}

function mapPokemon(raw) {
  const specialties = unique(Array.isArray(raw.specialties) ? raw.specialties : []);
  const favorites = unique(Array.isArray(raw.favorites) ? raw.favorites : []);

  const dexNumber = Number.isInteger(raw.dex_number) ? raw.dex_number : null;
  const dexPadded = dexNumber !== null ? String(dexNumber).padStart(3, "0") : "";
  const dexRaw = dexNumber !== null ? String(dexNumber) : "";
  const dexLabel = dexNumber !== null ? `#${dexPadded}` : "#---";
  const name = String(raw.name || "Unknown").trim();

  return {
    id: String(raw.form_slug || name),
    name,
    dexNumber,
    dexPadded,
    label: `${dexLabel} ${name}`,
    idealHabitat: String(raw.ideal_habitat || "").trim(),
    idealHabitatNorm: normalizeText(raw.ideal_habitat),
    specialties,
    specialtiesNorm: setFrom(specialties),
    favorites,
    favoritesNorm: setFrom(favorites),
    searchText: `${normalizeText(name)}|${dexPadded}|${dexRaw}`,
  };
}

function getGroupMembers() {
  return state.groupIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
}

function getImportanceRatio() {
  const raw = Number.parseFloat(elements.importanceRatio.value);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, raw));
}

function updateImportanceRatioLabel() {
  const a = getImportanceRatio();
  elements.importanceValue.textContent = a.toFixed(2);
}

function habitatPairScore(candidateHabitat, memberHabitat) {
  if (!candidateHabitat || !memberHabitat) {
    return 0;
  }
  if (candidateHabitat === memberHabitat) {
    return 1;
  }
  return HABITAT_INCOMPATIBLE.has(`${candidateHabitat}|${memberHabitat}`) ? -1 : 0;
}

function favoritesOverlapCount(aSet, bSet) {
  let count = 0;
  for (const item of aSet) {
    if (bSet.has(item)) {
      count += 1;
    }
  }
  return count;
}

function getSelectedSpecialtiesNormalized() {
  const checked = elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked");
  return [...checked].map((input) => normalizeText(input.value)).filter(Boolean);
}

function updateSpecialtiesHint() {
  const checked = elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked");
  const names = [...checked].map((input) => input.value);
  elements.specialtiesHint.textContent = names.length ? `Selected: ${names.join(", ")}` : "Any specialty";
}

function renderPokemonSelect(list) {
  const current = elements.pokemonSelect.value;
  elements.pokemonSelect.innerHTML = "";

  for (const pokemon of list) {
    const option = document.createElement("option");
    option.value = pokemon.id;
    option.textContent = pokemon.label;
    elements.pokemonSelect.appendChild(option);
  }

  if (!list.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No matches";
    elements.pokemonSelect.appendChild(option);
    elements.pokemonSelect.disabled = true;
    elements.addPokemon.disabled = true;
    return;
  }

  elements.pokemonSelect.disabled = false;
  elements.addPokemon.disabled = false;

  if (current && list.some((pokemon) => pokemon.id === current)) {
    elements.pokemonSelect.value = current;
  }
}

function applyPokemonSearchFilter() {
  const query = normalizeText(elements.pokemonSearch.value).replace(/^#/, "");
  const groupSet = new Set(state.groupIds);

  const filtered = state.sortedPokemon.filter((pokemon) => {
    if (groupSet.has(pokemon.id)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return pokemon.searchText.includes(query);
  });

  renderPokemonSelect(filtered);
}

function candidateMatchesRequirements(candidate) {
  const requiredHabitat = elements.requiredHabitat.value;
  const requiredSpecialties = getSelectedSpecialtiesNormalized();

  if (requiredHabitat && candidate.idealHabitatNorm !== normalizeText(requiredHabitat)) {
    return false;
  }

  if (requiredSpecialties.length > 0) {
    const hasSpecialtyMatch = requiredSpecialties.some((specialty) => candidate.specialtiesNorm.has(specialty));
    if (!hasSpecialtyMatch) {
      return false;
    }
  }

  return true;
}

function scoreCandidate(candidate, groupMembers, importanceRatio) {
  let habitatScore = 0;
  let favoritesScore = 0;

  for (const member of groupMembers) {
    habitatScore += habitatPairScore(candidate.idealHabitatNorm, member.idealHabitatNorm);
    favoritesScore += favoritesOverlapCount(candidate.favoritesNorm, member.favoritesNorm);
  }

  return {
    combinedScore: (1 - importanceRatio) * habitatScore + (1 + importanceRatio) * favoritesScore,
    habitatScore,
    favoritesScore,
  };
}

function addPokemonById(id) {
  if (!id || state.groupIds.includes(id) || !state.pokemonById.has(id)) {
    return;
  }

  state.groupIds.push(id);
  renderGroup();
  runRecommendation();
}

function renderGroup() {
  const members = getGroupMembers();
  elements.groupList.innerHTML = "";

  if (!members.length) {
    elements.groupHint.textContent = "Group is empty. Add at least one Pokemon to score recommendations.";
    applyPokemonSearchFilter();
    return;
  }

  elements.groupHint.textContent = `${members.length} Pokemon in group.`;

  for (const member of members) {
    const li = document.createElement("li");
    li.className = "group-item";

    const info = document.createElement("div");
    info.className = "group-info";

    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = member.label;
    const habitat = document.createElement("div");
    habitat.className = "group-meta";
    habitat.innerHTML = `<strong>Ideal Habitat:</strong> ${member.idealHabitat || "Unknown"}`;
    const specialties = document.createElement("div");
    specialties.className = "group-meta";
    specialties.innerHTML = `<strong>Specialties:</strong> ${listToText(member.specialties)}`;
    const favorites = document.createElement("div");
    favorites.className = "group-meta";
    favorites.innerHTML = `<strong>Favorites:</strong> ${listToText(member.favorites)}`;

    info.appendChild(title);
    info.appendChild(habitat);
    info.appendChild(specialties);
    info.appendChild(favorites);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      state.groupIds = state.groupIds.filter((id) => id !== member.id);
      renderGroup();
      runRecommendation();
    });

    li.appendChild(info);
    li.appendChild(removeBtn);
    elements.groupList.appendChild(li);
  }

  applyPokemonSearchFilter();
}

function populateRequirementSelects() {
  const habitats = unique(state.sortedPokemon.map((pokemon) => pokemon.idealHabitat).filter(Boolean)).sort((a, b) =>
    a.localeCompare(b),
  );
  elements.requiredHabitat.innerHTML = "<option value=''>Any</option>";
  for (const habitat of habitats) {
    const option = document.createElement("option");
    option.value = habitat;
    option.textContent = habitat;
    elements.requiredHabitat.appendChild(option);
  }

  const specialties = unique(state.sortedPokemon.flatMap((pokemon) => pokemon.specialties)).sort((a, b) =>
    a.localeCompare(b),
  );
  elements.requiredSpecialtiesBox.innerHTML = "";

  specialties.forEach((specialty, index) => {
    const id = `spec_${index}`;
    const label = document.createElement("label");
    label.className = "check-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = specialty;
    input.id = id;

    const text = document.createElement("span");
    text.textContent = specialty;

    label.appendChild(input);
    label.appendChild(text);
    elements.requiredSpecialtiesBox.appendChild(label);
  });

  updateSpecialtiesHint();
}

function runRecommendation() {
  const groupMembers = getGroupMembers();
  const groupSet = new Set(state.groupIds);
  const limit = Number(elements.resultCount.value);
  const importanceRatio = getImportanceRatio();

  const rows = [];

  for (const candidate of state.sortedPokemon) {
    if (groupSet.has(candidate.id)) {
      continue;
    }
    if (!candidateMatchesRequirements(candidate)) {
      continue;
    }

    const score = scoreCandidate(candidate, groupMembers, importanceRatio);

    const sharedFavoriteNames = unique(
      groupMembers.flatMap((member) => candidate.favorites.filter((fav) => member.favoritesNorm.has(normalizeText(fav)))),
    );

    rows.push({
      candidate,
      ...score,
      sharedFavoriteNames,
      notes: groupMembers.length ? "-" : "No group members yet",
    });
  }

  rows.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    if (b.habitatScore !== a.habitatScore) {
      return b.habitatScore - a.habitatScore;
    }
    if (b.favoritesScore !== a.favoritesScore) {
      return b.favoritesScore - a.favoritesScore;
    }
    if (b.sharedFavoriteNames.length !== a.sharedFavoriteNames.length) {
      return b.sharedFavoriteNames.length - a.sharedFavoriteNames.length;
    }
    return a.candidate.label.localeCompare(b.candidate.label);
  });

  const topRows = rows.slice(0, limit);
  elements.resultsBody.innerHTML = "";

  for (const [index, row] of topRows.entries()) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.candidate.label}</td>
      <td>${row.candidate.idealHabitat || "Unknown"}</td>
      <td><strong>${row.combinedScore.toFixed(2)}</strong></td>
      <td>${row.habitatScore}</td>
      <td>${row.favoritesScore}</td>
      <td>${row.sharedFavoriteNames.length ? row.sharedFavoriteNames.join(", ") : "-"}</td>
      <td>${row.notes}</td>
      <td><button type="button" class="tiny add-from-rec" data-id="${row.candidate.id}">Add</button></td>
    `;
    elements.resultsBody.appendChild(tr);
  }

  elements.status.textContent = `${topRows.length} shown out of ${rows.length} matching candidates.`;
}

function addSelectedPokemon() {
  addPokemonById(elements.pokemonSelect.value);
}

function clearSpecialtiesSelection() {
  const checked = elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked");
  checked.forEach((input) => {
    input.checked = false;
  });
  updateSpecialtiesHint();
  runRecommendation();
}

async function init() {
  try {
    elements.status.textContent = "Loading data...";

    const response = await fetch("data/pokopia_pokemon.json");
    if (!response.ok) {
      throw new Error(`Data load failed: ${response.status}`);
    }

    const payload = await response.json();
    state.pokemon = (payload.pokemon || []).map(mapPokemon);
    state.pokemonById = new Map(state.pokemon.map((pokemon) => [pokemon.id, pokemon]));
    state.sortedPokemon = [...state.pokemon].sort((a, b) => {
      const aDex = Number.isInteger(a.dexNumber) ? a.dexNumber : 9999;
      const bDex = Number.isInteger(b.dexNumber) ? b.dexNumber : 9999;
      if (aDex !== bDex) {
        return aDex - bDex;
      }
      return a.name.localeCompare(b.name);
    });

    populateRequirementSelects();
    applyPokemonSearchFilter();
    renderGroup();
    runRecommendation();

    elements.addPokemon.addEventListener("click", addSelectedPokemon);
    elements.clearGroup.addEventListener("click", () => {
      state.groupIds = [];
      renderGroup();
      runRecommendation();
    });

    elements.recommend.addEventListener("click", runRecommendation);
    elements.requiredHabitat.addEventListener("change", runRecommendation);
    elements.resultCount.addEventListener("change", runRecommendation);
    elements.importanceRatio.addEventListener("input", () => {
      updateImportanceRatioLabel();
      runRecommendation();
    });

    elements.clearSpecialties.addEventListener("click", clearSpecialtiesSelection);
    elements.requiredSpecialtiesBox.addEventListener("change", () => {
      updateSpecialtiesHint();
      runRecommendation();
    });

    elements.pokemonSearch.addEventListener("input", applyPokemonSearchFilter);
    elements.pokemonSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addSelectedPokemon();
      }
    });

    elements.resultsBody.addEventListener("click", (event) => {
      const button = event.target.closest("button.add-from-rec");
      if (!button) {
        return;
      }
      addPokemonById(button.dataset.id);
    });

    elements.status.textContent = `${state.pokemon.length} Pokemon loaded.`;
    updateImportanceRatioLabel();
  } catch (error) {
    console.error(error);
    elements.status.textContent = "Failed to load data. Start a local server and refresh.";
  }
}

init();
