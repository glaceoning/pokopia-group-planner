const HABITAT_CONFLICTING = new Set([
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
  groupOverlapVisible: false,
};

const elements = {
  pokemonSearch: document.querySelector("#pokemonSearch"),
  pokemonSelect: document.querySelector("#pokemonSelect"),
  addPokemon: document.querySelector("#addPokemon"),
  clearGroup: document.querySelector("#clearGroup"),
  groupList: document.querySelector("#groupList"),
  groupHint: document.querySelector("#groupHint"),
  groupTotalStacked: document.querySelector("#groupTotalStacked"),
  groupTotalSimple: document.querySelector("#groupTotalSimple"),
  toggleOverlap: document.querySelector("#toggleOverlap"),
  groupOverlapPanel: document.querySelector("#groupOverlapPanel"),
  habitatOverlapMeta: document.querySelector("#habitatOverlapMeta"),
  habitatOverlapList: document.querySelector("#habitatOverlapList"),
  favoritesOverlapMeta: document.querySelector("#favoritesOverlapMeta"),
  favoritesOverlapList: document.querySelector("#favoritesOverlapList"),
  requiredHabitat: document.querySelector("#requiredHabitat"),
  requiredSpecialtiesBox: document.querySelector("#requiredSpecialtiesBox"),
  clearSpecialties: document.querySelector("#clearSpecialties"),
  specialtiesHint: document.querySelector("#specialtiesHint"),
  importanceRatio: document.querySelector("#importanceRatio"),
  importanceValue: document.querySelector("#importanceValue"),
  resultCount: document.querySelector("#resultCount"),
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

function formatRecommendationSpecialties(values) {
  const cleaned = unique(values)
    .map((value) => String(value).trim());
  return cleaned.length ? cleaned.join(", ") : "-";
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
  return HABITAT_CONFLICTING.has(`${candidateHabitat}|${memberHabitat}`) ? -1 : 0;
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

function stackedOverlapScoreFromCount(count) {
  return count > 1 ? (count * (count - 1)) / 2 : 0;
}

function simpleOverlapScoreFromCount(count) {
  return count > 1 ? count - 1 : 0;
}

function countFeatureOverlap(groupMembers, valuesForMember) {
  const byFeature = new Map();

  for (const member of groupMembers) {
    const seenForMember = new Set();
    for (const raw of valuesForMember(member)) {
      const label = String(raw ?? "").trim();
      const norm = normalizeText(label);
      if (!norm || seenForMember.has(norm)) {
        continue;
      }
      seenForMember.add(norm);

      let entry = byFeature.get(norm);
      if (!entry) {
        entry = { label, count: 0, members: [] };
        byFeature.set(norm, entry);
      }

      entry.count += 1;
      entry.members.push(member.label);
    }
  }

  return byFeature;
}

function buildOverlapRows(byFeature) {
  return [...byFeature.values()]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });
}

function computeHabitatOverlapSummary(groupMembers) {
  const byHabitat = countFeatureOverlap(groupMembers, (member) => [member.idealHabitat]);

  let stackedPositive = 0;
  let simplePositive = 0;
  for (const entry of byHabitat.values()) {
    stackedPositive += stackedOverlapScoreFromCount(entry.count);
    simplePositive += simpleOverlapScoreFromCount(entry.count);
  }

  let conflictPairs = 0;
  for (let i = 0; i < groupMembers.length; i += 1) {
    for (let j = i + 1; j < groupMembers.length; j += 1) {
      if (habitatPairScore(groupMembers[i].idealHabitatNorm, groupMembers[j].idealHabitatNorm) < 0) {
        conflictPairs += 1;
      }
    }
  }

  return {
    overlapRows: buildOverlapRows(byHabitat),
    conflictPairs,
    stackedScore: stackedPositive - conflictPairs,
    simpleScore: simplePositive - conflictPairs,
  };
}

function computeFavoritesOverlapSummary(groupMembers) {
  const byFavorite = countFeatureOverlap(groupMembers, (member) => member.favorites);

  let stackedScore = 0;
  let simpleScore = 0;
  for (const entry of byFavorite.values()) {
    stackedScore += stackedOverlapScoreFromCount(entry.count);
    simpleScore += simpleOverlapScoreFromCount(entry.count);
  }

  return {
    overlapRows: buildOverlapRows(byFavorite),
    stackedScore,
    simpleScore,
  };
}

function computeGroupScoreSummary(groupMembers, importanceRatio) {
  const habitat = computeHabitatOverlapSummary(groupMembers);
  const favorites = computeFavoritesOverlapSummary(groupMembers);

  return {
    habitat,
    favorites,
    stackedCombined: (1 - importanceRatio) * habitat.stackedScore + (1 + importanceRatio) * favorites.stackedScore,
    simpleCombined: (1 - importanceRatio) * habitat.simpleScore + (1 + importanceRatio) * favorites.simpleScore,
  };
}

function renderOverlapList(listEl, rows, emptyText) {
  listEl.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "overlap-empty";
    empty.textContent = emptyText;
    listEl.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const item = document.createElement("li");
    item.className = "overlap-item";

    const name = document.createElement("strong");
    name.textContent = row.label;

    const count = document.createElement("span");
    count.className = "overlap-count";
    count.textContent = `x${row.count}`;

    const members = document.createElement("div");
    members.className = "overlap-members";
    members.textContent = row.members.join(", ");

    item.appendChild(name);
    item.appendChild(count);
    item.appendChild(members);
    listEl.appendChild(item);
  }
}

function setOverlapPanelVisibility(visible) {
  state.groupOverlapVisible = visible;
  elements.groupOverlapPanel.classList.toggle("hidden", !visible);
  elements.toggleOverlap.textContent = visible ? "Hide Overlap Details" : "Show Overlap Details";
  elements.toggleOverlap.setAttribute("aria-expanded", String(visible));
}

function renderGroupInsights(groupMembers = getGroupMembers()) {
  const importanceRatio = getImportanceRatio();
  const summary = computeGroupScoreSummary(groupMembers, importanceRatio);
  elements.groupTotalStacked.textContent = summary.stackedCombined.toFixed(2);
  elements.groupTotalSimple.textContent = summary.simpleCombined.toFixed(2);

  renderOverlapList(elements.habitatOverlapList, summary.habitat.overlapRows, "No shared habitat.");
  renderOverlapList(elements.favoritesOverlapList, summary.favorites.overlapRows, "No shared favorites.");

  const topHabitat = summary.habitat.overlapRows[0];
  elements.habitatOverlapMeta.textContent = topHabitat
    ? `Top overlap: ${topHabitat.label} (${topHabitat.count} Pokemon). Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`
    : `No shared habitat in current group. Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`;

  const topFavorite = summary.favorites.overlapRows[0];
  elements.favoritesOverlapMeta.textContent = topFavorite
    ? `Top overlap: ${topFavorite.label} (${topFavorite.count} Pokemon).`
    : "No shared favorites in current group.";

  const hasMembers = groupMembers.length > 0;
  elements.toggleOverlap.disabled = !hasMembers;
  if (!hasMembers && state.groupOverlapVisible) {
    setOverlapPanelVisibility(false);
  }
}

function getSelectedSpecialtiesNormalized() {
  const checked = elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked");
  return [...checked].map((input) => normalizeText(input.value)).filter(Boolean);
}

function getCurrentRequirements() {
  return {
    requiredHabitatNorm: normalizeText(elements.requiredHabitat.value),
    requiredSpecialtiesNorm: getSelectedSpecialtiesNormalized(),
  };
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

function candidateMatchesRequirements(candidate, requirements) {
  if (requirements.requiredHabitatNorm && candidate.idealHabitatNorm !== requirements.requiredHabitatNorm) {
    return false;
  }

  if (requirements.requiredSpecialtiesNorm.length > 0) {
    const hasSpecialtyMatch = requirements.requiredSpecialtiesNorm.some((specialty) => candidate.specialtiesNorm.has(specialty));
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

function getSharedFavoriteNames(candidate, groupMembers) {
  return candidate.favorites.filter((favorite) => {
    const favoriteNorm = normalizeText(favorite);
    return favoriteNorm && groupMembers.some((member) => member.favoritesNorm.has(favoriteNorm));
  });
}

function refreshAfterGroupChange() {
  renderGroup();
  runRecommendation();
}

function addPokemonById(id) {
  if (!id || state.groupIds.includes(id) || !state.pokemonById.has(id)) {
    return;
  }

  state.groupIds.push(id);
  refreshAfterGroupChange();
}

function removePokemonById(id) {
  const nextIds = state.groupIds.filter((groupId) => groupId !== id);
  if (nextIds.length === state.groupIds.length) {
    return;
  }

  state.groupIds = nextIds;
  refreshAfterGroupChange();
}

function clearGroup() {
  if (!state.groupIds.length) {
    return;
  }

  state.groupIds = [];
  refreshAfterGroupChange();
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
      removePokemonById(member.id);
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
  const requirements = getCurrentRequirements();
  const groupSet = new Set(state.groupIds);
  const limit = Number(elements.resultCount.value);
  const importanceRatio = getImportanceRatio();

  const rows = [];

  for (const candidate of state.sortedPokemon) {
    if (groupSet.has(candidate.id)) {
      continue;
    }
    if (!candidateMatchesRequirements(candidate, requirements)) {
      continue;
    }

    const score = scoreCandidate(candidate, groupMembers, importanceRatio);

    rows.push({
      candidate,
      ...score,
      sharedFavoriteNames: getSharedFavoriteNames(candidate, groupMembers),
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
    const cells = [
      { label: "Rank", value: String(index + 1) },
      { label: "Pokemon", value: row.candidate.label },
      { label: "Ideal Habitat", value: row.candidate.idealHabitat || "Unknown" },
      { label: "Combined Score", value: `<strong>${row.combinedScore.toFixed(2)}</strong>` },
      { label: "Habitat Score", value: String(row.habitatScore) },
      { label: "Favorites Score", value: String(row.favoritesScore) },
      {
        label: "Shared Favorites",
        value: row.sharedFavoriteNames.length ? row.sharedFavoriteNames.join(", ") : "-",
      },
      {
        label: "Specialties",
        value: formatRecommendationSpecialties(row.candidate.specialties),
      },
      {
        label: "Action",
        value: `<button type="button" class="tiny add-from-rec" data-id="${row.candidate.id}">Add</button>`,
      },
    ];

    tr.innerHTML = cells
      .map(({ label, value }) => `<td data-label="${label}">${value}</td>`)
      .join("");

    elements.resultsBody.appendChild(tr);
  }

  elements.status.textContent = `${topRows.length} shown out of ${rows.length} matching candidates.`;
  renderGroupInsights(groupMembers);
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
    elements.pokemonSelect.addEventListener("change", addSelectedPokemon);
    elements.clearGroup.addEventListener("click", clearGroup);

    elements.requiredHabitat.addEventListener("change", runRecommendation);
    elements.resultCount.addEventListener("change", runRecommendation);
    elements.importanceRatio.addEventListener("input", () => {
      updateImportanceRatioLabel();
      runRecommendation();
    });
    elements.toggleOverlap.addEventListener("click", () => {
      if (elements.toggleOverlap.disabled) {
        return;
      }
      setOverlapPanelVisibility(!state.groupOverlapVisible);
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
    setOverlapPanelVisibility(false);
    updateImportanceRatioLabel();
  } catch (error) {
    console.error(error);
    elements.status.textContent = "Failed to load data. Start a local server and refresh.";
  }
}

init();
