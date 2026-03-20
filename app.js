const HABITAT_CONFLICTING = new Set([
  'bright|dark',
  'dark|bright',
  'humid|dry',
  'dry|humid',
  'warm|cool',
  'cool|warm',
]);

const STORAGE_KEYS = {
  groupIds: 'pokopia.groupIds',
  requirements: 'pokopia.requirements',
  personalization: 'pokopia.personalization',
};

const DEFAULT_PERSONALIZATION = {
  trainerName: '',
  plannerTitle: '',
  personalNotes: '',
};

const state = {
  pokemon: [],
  sortedPokemon: [],
  pokemonById: new Map(),
  pokemonLookup: new Map(),
  groupIds: [],
  groupOverlapVisible: false,
  personalization: { ...DEFAULT_PERSONALIZATION },
  filteredPokemonIds: [],
};

const elements = {
  heroEyebrow: document.querySelector('#heroEyebrow'),
  heroTitle: document.querySelector('#heroTitle'),
  trainerName: document.querySelector('#trainerName'),
  plannerTitle: document.querySelector('#plannerTitle'),
  personalNotes: document.querySelector('#personalNotes'),
  savePersonalization: document.querySelector('#savePersonalization'),
  resetPersonalization: document.querySelector('#resetPersonalization'),
  personalizationStatus: document.querySelector('#personalizationStatus'),
  pokemonSearch: document.querySelector('#pokemonSearch'),
  bulkPickerList: document.querySelector('#bulkPickerList'),
  pickerCount: document.querySelector('#pickerCount'),
  selectVisiblePokemon: document.querySelector('#selectVisiblePokemon'),
  clearVisibleSelection: document.querySelector('#clearVisibleSelection'),
  addSelectedPokemon: document.querySelector('#addSelectedPokemon'),
  pasteImport: document.querySelector('#pasteImport'),
  readClipboard: document.querySelector('#readClipboard'),
  importPokemonList: document.querySelector('#importPokemonList'),
  importFeedback: document.querySelector('#importFeedback'),
  clearGroup: document.querySelector('#clearGroup'),
  groupList: document.querySelector('#groupList'),
  groupHint: document.querySelector('#groupHint'),
  groupTotalStacked: document.querySelector('#groupTotalStacked'),
  groupTotalSimple: document.querySelector('#groupTotalSimple'),
  toggleOverlap: document.querySelector('#toggleOverlap'),
  groupOverlapPanel: document.querySelector('#groupOverlapPanel'),
  habitatOverlapMeta: document.querySelector('#habitatOverlapMeta'),
  habitatOverlapList: document.querySelector('#habitatOverlapList'),
  favoritesOverlapMeta: document.querySelector('#favoritesOverlapMeta'),
  favoritesOverlapList: document.querySelector('#favoritesOverlapList'),
  requiredHabitat: document.querySelector('#requiredHabitat'),
  requiredSpecialtiesBox: document.querySelector('#requiredSpecialtiesBox'),
  clearSpecialties: document.querySelector('#clearSpecialties'),
  specialtiesHint: document.querySelector('#specialtiesHint'),
  importanceRatio: document.querySelector('#importanceRatio'),
  importanceValue: document.querySelector('#importanceValue'),
  resultCount: document.querySelector('#resultCount'),
  resultsBody: document.querySelector('#resultsBody'),
  status: document.querySelector('#status'),
};

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeImportToken(value) {
  return normalizeText(value).replace(/^#/, '');
}

function unique(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const clean = String(value ?? '').trim();
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
  return values.length ? values.join(', ') : '—';
}

function formatRecommendationSpecialties(values) {
  const cleaned = unique(values).map((value) => String(value).trim());
  return cleaned.length ? cleaned.join(', ') : '—';
}

function mapPokemon(raw) {
  const specialties = unique(Array.isArray(raw.specialties) ? raw.specialties : []);
  const favorites = unique(Array.isArray(raw.favorites) ? raw.favorites : []);

  const dexNumber = Number.isInteger(raw.dex_number) ? raw.dex_number : null;
  const dexPadded = dexNumber !== null ? String(dexNumber).padStart(3, '0') : '';
  const dexRaw = dexNumber !== null ? String(dexNumber) : '';
  const dexLabel = dexNumber !== null ? `#${dexPadded}` : '#---';
  const name = String(raw.name || 'Unknown').trim();
  const id = String(raw.form_slug || name);

  return {
    id,
    name,
    dexNumber,
    dexPadded,
    dexRaw,
    label: `${dexLabel} ${name}`,
    idealHabitat: String(raw.ideal_habitat || '').trim(),
    idealHabitatNorm: normalizeText(raw.ideal_habitat),
    specialties,
    specialtiesNorm: setFrom(specialties),
    favorites,
    favoritesNorm: setFrom(favorites),
    searchText: `${normalizeText(name)}|${dexPadded}|${dexRaw}`,
  };
}

function buildPokemonLookup() {
  const lookup = new Map();

  for (const pokemon of state.sortedPokemon) {
    const tokens = [
      pokemon.name,
      pokemon.label,
      pokemon.dexPadded,
      pokemon.dexRaw,
      `#${pokemon.dexPadded}`,
      `#${pokemon.dexRaw}`,
    ];

    for (const token of tokens) {
      const normalized = normalizeImportToken(token);
      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, pokemon.id);
      }
    }
  }

  state.pokemonLookup = lookup;
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
      const label = String(raw ?? '').trim();
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
  listEl.innerHTML = '';

  if (!rows.length) {
    const empty = document.createElement('li');
    empty.className = 'overlap-empty';
    empty.textContent = emptyText;
    listEl.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const item = document.createElement('li');
    item.className = 'overlap-item';

    const name = document.createElement('strong');
    name.textContent = row.label;

    const count = document.createElement('span');
    count.className = 'overlap-count';
    count.textContent = `x${row.count}`;

    const members = document.createElement('div');
    members.className = 'overlap-members';
    members.textContent = row.members.join(', ');

    item.appendChild(name);
    item.appendChild(count);
    item.appendChild(members);
    listEl.appendChild(item);
  }
}

function setOverlapPanelVisibility(visible) {
  state.groupOverlapVisible = visible;
  elements.groupOverlapPanel.classList.toggle('hidden', !visible);
  elements.toggleOverlap.textContent = visible ? 'Hide overlap details' : 'Show overlap details';
  elements.toggleOverlap.setAttribute('aria-expanded', String(visible));
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to read local storage key: ${key}`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to write local storage key: ${key}`, error);
    return false;
  }
}

function applyPersonalization() {
  const trainerName = String(state.personalization.trainerName || '').trim();
  const plannerTitle = String(state.personalization.plannerTitle || '').trim();

  elements.trainerName.value = trainerName;
  elements.plannerTitle.value = plannerTitle;
  elements.personalNotes.value = String(state.personalization.personalNotes || '');

  elements.heroEyebrow.textContent = trainerName ? `${trainerName}'s Pokopia Planner` : 'Pokopia Group Planner';
  elements.heroTitle.textContent = plannerTitle || 'Build your best Pokopia group faster';
  document.title = plannerTitle || 'Pokopia Group Planner';
}

function savePersonalization() {
  state.personalization = {
    trainerName: String(elements.trainerName.value || '').trim(),
    plannerTitle: String(elements.plannerTitle.value || '').trim(),
    personalNotes: String(elements.personalNotes.value || '').trim(),
  };

  applyPersonalization();
  const saved = writeStorage(STORAGE_KEYS.personalization, state.personalization);
  elements.personalizationStatus.textContent = saved
    ? 'Saved planner details in this browser.'
    : 'Could not save settings in this browser, but your changes still appear on screen.';
}

function resetPersonalization() {
  state.personalization = { ...DEFAULT_PERSONALIZATION };
  applyPersonalization();
  const saved = writeStorage(STORAGE_KEYS.personalization, state.personalization);
  elements.personalizationStatus.textContent = saved
    ? 'Saved planner details were reset for this browser.'
    : 'The fields were reset on screen, but browser storage could not be updated.';
}

function saveRequirements() {
  const checkedSpecialties = [...elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );

  writeStorage(STORAGE_KEYS.requirements, {
    requiredHabitat: elements.requiredHabitat.value,
    selectedSpecialties: checkedSpecialties,
    resultCount: elements.resultCount.value,
    importanceRatio: elements.importanceRatio.value,
  });
}

function restoreRequirements() {
  const saved = readStorage(STORAGE_KEYS.requirements, null);
  if (!saved) {
    return;
  }

  if (typeof saved.requiredHabitat === 'string') {
    elements.requiredHabitat.value = saved.requiredHabitat;
  }

  if (typeof saved.resultCount === 'string') {
    elements.resultCount.value = saved.resultCount;
  }

  if (typeof saved.importanceRatio === 'string') {
    elements.importanceRatio.value = saved.importanceRatio;
  }

  const specialties = Array.isArray(saved.selectedSpecialties) ? new Set(saved.selectedSpecialties) : new Set();
  const boxes = elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']");
  boxes.forEach((input) => {
    input.checked = specialties.has(input.value);
  });
}

function restoreGroupIds() {
  const savedIds = readStorage(STORAGE_KEYS.groupIds, []);
  if (!Array.isArray(savedIds)) {
    return;
  }
  state.groupIds = savedIds.filter((id) => typeof id === 'string' && state.pokemonById.has(id));
}

function saveGroupIds() {
  writeStorage(STORAGE_KEYS.groupIds, state.groupIds);
}

function renderGroupInsights(groupMembers = getGroupMembers()) {
  const importanceRatio = getImportanceRatio();
  const summary = computeGroupScoreSummary(groupMembers, importanceRatio);
  elements.groupTotalStacked.textContent = summary.stackedCombined.toFixed(2);
  elements.groupTotalSimple.textContent = summary.simpleCombined.toFixed(2);

  renderOverlapList(elements.habitatOverlapList, summary.habitat.overlapRows, 'No shared habitat.');
  renderOverlapList(elements.favoritesOverlapList, summary.favorites.overlapRows, 'No shared favorites.');

  const topHabitat = summary.habitat.overlapRows[0];
  elements.habitatOverlapMeta.textContent = topHabitat
    ? `Top overlap: ${topHabitat.label} (${topHabitat.count} Pokémon). Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`
    : `No shared habitat in the current group. Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`;

  const topFavorite = summary.favorites.overlapRows[0];
  elements.favoritesOverlapMeta.textContent = topFavorite
    ? `Top overlap: ${topFavorite.label} (${topFavorite.count} Pokémon).`
    : 'No shared favorites in the current group.';

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
  elements.specialtiesHint.textContent = names.length ? `Filtering to: ${names.join(', ')}` : 'Showing all specialties';
}

function getFilteredPokemon() {
  const query = normalizeText(elements.pokemonSearch.value).replace(/^#/, '');
  const groupSet = new Set(state.groupIds);

  return state.sortedPokemon.filter((pokemon) => {
    if (groupSet.has(pokemon.id)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return pokemon.searchText.includes(query);
  });
}

function updatePickerSelectionCount() {
  const checkedCount = elements.bulkPickerList.querySelectorAll("input[type='checkbox']:checked").length;
  elements.pickerCount.textContent = `${checkedCount} selected`;
  elements.addSelectedPokemon.disabled = checkedCount === 0;
}

function renderBulkPicker() {
  const filteredPokemon = getFilteredPokemon();
  state.filteredPokemonIds = filteredPokemon.map((pokemon) => pokemon.id);
  const selectedIds = new Set(
    [...elements.bulkPickerList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value),
  );

  elements.bulkPickerList.innerHTML = '';

  if (!filteredPokemon.length) {
    const empty = document.createElement('div');
    empty.className = 'bulk-picker-empty';
    empty.textContent = 'No Pokémon match this search.';
    elements.bulkPickerList.appendChild(empty);
    updatePickerSelectionCount();
    return;
  }

  for (const pokemon of filteredPokemon) {
    const label = document.createElement('label');
    label.className = 'picker-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = pokemon.id;
    checkbox.checked = selectedIds.has(pokemon.id);

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'picker-item-title';
    title.textContent = pokemon.label;

    const meta = document.createElement('div');
    meta.className = 'picker-item-meta';
    meta.innerHTML = `<strong>Habitat:</strong> ${pokemon.idealHabitat || 'Unknown'}<br><strong>Specialties:</strong> ${listToText(
      pokemon.specialties,
    )}`;

    content.appendChild(title);
    content.appendChild(meta);

    label.appendChild(checkbox);
    label.appendChild(content);
    elements.bulkPickerList.appendChild(label);
  }

  updatePickerSelectionCount();
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
  renderBulkPicker();
  runRecommendation();
}

function addPokemonById(id) {
  if (!id || state.groupIds.includes(id) || !state.pokemonById.has(id)) {
    return false;
  }

  state.groupIds.push(id);
  return true;
}

function addPokemonByIds(ids) {
  let added = 0;

  for (const id of ids) {
    if (addPokemonById(id)) {
      added += 1;
    }
  }

  if (added > 0) {
    saveGroupIds();
    refreshAfterGroupChange();
  }

  return added;
}

function removePokemonById(id) {
  const nextIds = state.groupIds.filter((groupId) => groupId !== id);
  if (nextIds.length === state.groupIds.length) {
    return;
  }

  state.groupIds = nextIds;
  saveGroupIds();
  refreshAfterGroupChange();
}

function clearGroup() {
  if (!state.groupIds.length) {
    return;
  }

  state.groupIds = [];
  saveGroupIds();
  refreshAfterGroupChange();
  elements.importFeedback.textContent = 'Current group cleared.';
}

function renderGroup() {
  const members = getGroupMembers();
  elements.groupList.innerHTML = '';

  if (!members.length) {
    elements.groupHint.textContent = 'Your group is empty right now. Add at least one Pokémon to start comparing recommendations.';
    return;
  }

  elements.groupHint.textContent = `${members.length} Pokémon currently in your group.`;

  for (const member of members) {
    const li = document.createElement('li');
    li.className = 'group-item';

    const info = document.createElement('div');
    info.className = 'group-info';

    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = member.label;

    const habitat = document.createElement('div');
    habitat.className = 'group-meta';
    habitat.innerHTML = `<strong>Ideal Habitat:</strong> ${member.idealHabitat || 'Unknown'}`;

    const specialties = document.createElement('div');
    specialties.className = 'group-meta';
    specialties.innerHTML = `<strong>Specialties:</strong> ${listToText(member.specialties)}`;

    const favorites = document.createElement('div');
    favorites.className = 'group-meta';
    favorites.innerHTML = `<strong>Favorites:</strong> ${listToText(member.favorites)}`;

    info.appendChild(title);
    info.appendChild(habitat);
    info.appendChild(specialties);
    info.appendChild(favorites);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      removePokemonById(member.id);
    });

    li.appendChild(info);
    li.appendChild(removeBtn);
    elements.groupList.appendChild(li);
  }
}

function populateRequirementSelects() {
  const habitats = unique(state.sortedPokemon.map((pokemon) => pokemon.idealHabitat).filter(Boolean)).sort((a, b) =>
    a.localeCompare(b),
  );

  elements.requiredHabitat.innerHTML = "<option value=''>Any habitat</option>";
  for (const habitat of habitats) {
    const option = document.createElement('option');
    option.value = habitat;
    option.textContent = habitat;
    elements.requiredHabitat.appendChild(option);
  }

  const specialties = unique(state.sortedPokemon.flatMap((pokemon) => pokemon.specialties)).sort((a, b) =>
    a.localeCompare(b),
  );
  elements.requiredSpecialtiesBox.innerHTML = '';

  specialties.forEach((specialty, index) => {
    const id = `spec_${index}`;
    const label = document.createElement('label');
    label.className = 'check-item';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = specialty;
    input.id = id;

    const text = document.createElement('span');
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
  elements.resultsBody.innerHTML = '';

  for (const [index, row] of topRows.entries()) {
    const tr = document.createElement('tr');
    const cells = [
      { label: 'Rank', value: String(index + 1) },
      { label: 'Pokémon', value: row.candidate.label },
      { label: 'Ideal Habitat', value: row.candidate.idealHabitat || 'Unknown' },
      { label: 'Combined Score', value: `<strong>${row.combinedScore.toFixed(2)}</strong>` },
      { label: 'Habitat Score', value: String(row.habitatScore) },
      { label: 'Favorites Score', value: String(row.favoritesScore) },
      {
        label: 'Shared Favorites',
        value: row.sharedFavoriteNames.length ? row.sharedFavoriteNames.join(', ') : '—',
      },
      {
        label: 'Specialties',
        value: formatRecommendationSpecialties(row.candidate.specialties),
      },
      {
        label: 'Action',
        value: `<button type="button" class="tiny add-from-rec" data-id="${row.candidate.id}">Add</button>`,
      },
    ];

    tr.innerHTML = cells.map(({ label, value }) => `<td data-label="${label}">${value}</td>`).join('');
    elements.resultsBody.appendChild(tr);
  }

  elements.status.textContent = `${topRows.length} shown out of ${rows.length} matching candidates.`;
  renderGroupInsights(groupMembers);
  saveRequirements();
}

function getCheckedPickerIds() {
  return [...elements.bulkPickerList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function addCheckedPokemon() {
  const selectedIds = getCheckedPickerIds();
  if (!selectedIds.length) {
    elements.importFeedback.textContent = 'Select at least one Pokémon from the bulk picker first.';
    return;
  }

  const added = addPokemonByIds(selectedIds);
  elements.importFeedback.textContent =
    added > 0 ? `Added ${added} Pokémon from the bulk picker.` : 'Those Pokémon were already in your group.';
}

function setVisiblePickerSelection(checked) {
  const boxes = elements.bulkPickerList.querySelectorAll("input[type='checkbox']");
  boxes.forEach((input) => {
    input.checked = checked;
  });
  updatePickerSelectionCount();
}

function parseImportText(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchedIds = [];
  const missing = [];

  for (const line of lines) {
    const id = state.pokemonLookup.get(normalizeImportToken(line));
    if (id) {
      matchedIds.push(id);
    } else {
      missing.push(line);
    }
  }

  return {
    lines,
    matchedIds: unique(matchedIds),
    missing,
  };
}

function importPokemonListFromText(text) {
  const { lines, matchedIds, missing } = parseImportText(text);

  if (!lines.length) {
    elements.importFeedback.textContent = 'Paste at least one Pokémon name before importing.';
    return;
  }

  const added = addPokemonByIds(matchedIds);
  const parts = [`Read ${lines.length} lines.`, `Added ${added} Pokémon.`];

  if (missing.length) {
    parts.push(`Could not match: ${missing.join(', ')}.`);
  }

  if (!matchedIds.length) {
    parts.push('Make sure each line contains an exact Pokémon name or dex number.');
  }

  elements.importFeedback.textContent = parts.join(' ');
}

async function readClipboardIntoTextarea() {
  if (!navigator.clipboard?.readText) {
    elements.importFeedback.textContent = 'Clipboard paste is not available in this browser. Paste into the text box manually instead.';
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    elements.pasteImport.value = text;
    importPokemonListFromText(text);
  } catch (error) {
    console.error(error);
    elements.importFeedback.textContent = 'Clipboard access failed. Try pasting into the text box manually instead.';
  }
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
    elements.status.textContent = 'Loading data…';

    const response = await fetch('data/pokopia_pokemon.json');
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
    buildPokemonLookup();

    state.personalization = {
      ...DEFAULT_PERSONALIZATION,
      ...readStorage(STORAGE_KEYS.personalization, {}),
    };
    applyPersonalization();

    populateRequirementSelects();
    restoreRequirements();
    restoreGroupIds();
    renderGroup();
    renderBulkPicker();
    updateSpecialtiesHint();
    updateImportanceRatioLabel();
    runRecommendation();

    elements.savePersonalization.addEventListener('click', savePersonalization);
    elements.resetPersonalization.addEventListener('click', resetPersonalization);

    elements.pokemonSearch.addEventListener('input', renderBulkPicker);
    elements.bulkPickerList.addEventListener('change', (event) => {
      if (event.target.matches("input[type='checkbox']")) {
        updatePickerSelectionCount();
      }
    });
    elements.selectVisiblePokemon.addEventListener('click', () => setVisiblePickerSelection(true));
    elements.clearVisibleSelection.addEventListener('click', () => setVisiblePickerSelection(false));
    elements.addSelectedPokemon.addEventListener('click', addCheckedPokemon);

    elements.readClipboard.addEventListener('click', readClipboardIntoTextarea);
    elements.importPokemonList.addEventListener('click', () => importPokemonListFromText(elements.pasteImport.value));

    elements.clearGroup.addEventListener('click', clearGroup);
    elements.requiredHabitat.addEventListener('change', runRecommendation);
    elements.resultCount.addEventListener('change', runRecommendation);
    elements.importanceRatio.addEventListener('input', () => {
      updateImportanceRatioLabel();
      runRecommendation();
    });

    elements.toggleOverlap.addEventListener('click', () => {
      if (elements.toggleOverlap.disabled) {
        return;
      }
      setOverlapPanelVisibility(!state.groupOverlapVisible);
    });

    elements.clearSpecialties.addEventListener('click', clearSpecialtiesSelection);
    elements.requiredSpecialtiesBox.addEventListener('change', () => {
      updateSpecialtiesHint();
      runRecommendation();
    });

    elements.resultsBody.addEventListener('click', (event) => {
      const button = event.target.closest('button.add-from-rec');
      if (!button) {
        return;
      }

      const added = addPokemonByIds([button.dataset.id]);
      elements.importFeedback.textContent = added ? 'Added the recommended Pokémon to your current group.' : 'That Pokémon is already in your current group.';
    });

    elements.status.textContent = `${state.pokemon.length} Pokémon loaded.`;
    elements.personalizationStatus.textContent = 'Planner details, your group, and your filters are stored only in this browser.';
    setOverlapPanelVisibility(false);
  } catch (error) {
    console.error(error);
    elements.status.textContent = 'Failed to load data. Start a local server and refresh.';
  }
}

init();
