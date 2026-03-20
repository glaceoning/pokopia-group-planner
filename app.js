const HABITAT_CONFLICTING = new Set([
  'bright|dark',
  'dark|bright',
  'humid|dry',
  'dry|humid',
  'warm|cool',
  'cool|warm',
]);

const STORAGE_KEYS = {
  teamIds: 'pokopia.teamIds',
  groupIds: 'pokopia.groupIds',
  ownedIds: 'pokopia.ownedIds',
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
  ownedIds: [],
  teamIds: [],
  filteredCatalogIds: [],
  filteredOwnedIds: [],
  groupOverlapVisible: false,
  personalization: { ...DEFAULT_PERSONALIZATION },
  lastRecommendationRows: [],
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
  jumpToImport: document.querySelector('#jumpToImport'),
  jumpToRecommendations: document.querySelector('#jumpToRecommendations'),
  importSection: document.querySelector('#importSection'),
  recommendationsSection: document.querySelector('#recommendationsSection'),
  ownedCountHero: document.querySelector('#ownedCountHero'),
  teamCountHero: document.querySelector('#teamCountHero'),
  recommendationModeHero: document.querySelector('#recommendationModeHero'),
  ownedCountStat: document.querySelector('#ownedCountStat'),
  ownedCoverageStat: document.querySelector('#ownedCoverageStat'),
  teamCountStat: document.querySelector('#teamCountStat'),
  teamSummaryStat: document.querySelector('#teamSummaryStat'),
  topRecommendationScore: document.querySelector('#topRecommendationScore'),
  topRecommendationName: document.querySelector('#topRecommendationName'),
  recommendationModeStat: document.querySelector('#recommendationModeStat'),
  unownedVisibleStat: document.querySelector('#unownedVisibleStat'),
  plannerInsight: document.querySelector('#plannerInsight'),
  catalogSearch: document.querySelector('#catalogSearch'),
  catalogList: document.querySelector('#catalogList'),
  catalogSelectionCount: document.querySelector('#catalogSelectionCount'),
  selectAllVisibleCatalog: document.querySelector('#selectAllVisibleCatalog'),
  clearVisibleCatalog: document.querySelector('#clearVisibleCatalog'),
  addCatalogSelection: document.querySelector('#addCatalogSelection'),
  clearOwnedDex: document.querySelector('#clearOwnedDex'),
  pasteImport: document.querySelector('#pasteImport'),
  readClipboard: document.querySelector('#readClipboard'),
  importPokemonList: document.querySelector('#importPokemonList'),
  importFeedback: document.querySelector('#importFeedback'),
  ownedSearch: document.querySelector('#ownedSearch'),
  ownedSearchSummary: document.querySelector('#ownedSearchSummary'),
  ownedDexEmpty: document.querySelector('#ownedDexEmpty'),
  ownedDexList: document.querySelector('#ownedDexList'),
  clearTeam: document.querySelector('#clearTeam'),
  teamEmpty: document.querySelector('#teamEmpty'),
  teamList: document.querySelector('#teamList'),
  groupTotalStacked: document.querySelector('#groupTotalStacked'),
  groupTotalSimple: document.querySelector('#groupTotalSimple'),
  toggleOverlap: document.querySelector('#toggleOverlap'),
  groupOverlapPanel: document.querySelector('#groupOverlapPanel'),
  habitatOverlapMeta: document.querySelector('#habitatOverlapMeta'),
  habitatOverlapList: document.querySelector('#habitatOverlapList'),
  favoritesOverlapMeta: document.querySelector('#favoritesOverlapMeta'),
  favoritesOverlapList: document.querySelector('#favoritesOverlapList'),
  ownedOnlyToggle: document.querySelector('#ownedOnlyToggle'),
  requiredHabitat: document.querySelector('#requiredHabitat'),
  requiredSpecialtiesBox: document.querySelector('#requiredSpecialtiesBox'),
  clearSpecialties: document.querySelector('#clearSpecialties'),
  specialtiesHint: document.querySelector('#specialtiesHint'),
  resultCount: document.querySelector('#resultCount'),
  importanceRatio: document.querySelector('#importanceRatio'),
  importanceValue: document.querySelector('#importanceValue'),
  topRecommendationSpotlight: document.querySelector('#topRecommendationSpotlight'),
  spotlightName: document.querySelector('#spotlightName'),
  spotlightSummary: document.querySelector('#spotlightSummary'),
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

function mapPokemon(raw) {
  const specialties = unique(Array.isArray(raw.specialties) ? raw.specialties : []);
  const favorites = unique(Array.isArray(raw.favorites) ? raw.favorites : []);
  const locations = unique(Array.isArray(raw.locations) ? raw.locations : []);
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
    locations,
    searchText: [normalizeText(name), dexPadded, dexRaw, normalizeText(specialties.join(' ')), normalizeText(favorites.join(' '))].join('|'),
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

function getOwnedPokemon() {
  return state.ownedIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
}

function getTeamMembers() {
  return state.teamIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
}

function getOwnedOnlyMode() {
  return Boolean(elements.ownedOnlyToggle.checked);
}

function getImportanceRatio() {
  const raw = Number.parseFloat(elements.importanceRatio.value);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, raw));
}

function updateImportanceRatioLabel() {
  elements.importanceValue.textContent = getImportanceRatio().toFixed(2);
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
    item.innerHTML = `
      <div class="overlap-top">
        <strong>${row.label}</strong>
        <span class="overlap-count">x${row.count}</span>
      </div>
      <div class="overlap-members">${row.members.join(', ')}</div>
    `;
    listEl.appendChild(item);
  }
}

function setOverlapPanelVisibility(visible) {
  state.groupOverlapVisible = visible;
  elements.groupOverlapPanel.classList.toggle('hidden', !visible);
  elements.toggleOverlap.textContent = visible ? 'Hide synergy details' : 'Show synergy details';
  elements.toggleOverlap.setAttribute('aria-expanded', String(visible));
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
    ownedOnly: elements.ownedOnlyToggle.checked,
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
  if (typeof saved.ownedOnly === 'boolean') {
    elements.ownedOnlyToggle.checked = saved.ownedOnly;
  }

  const specialties = Array.isArray(saved.selectedSpecialties) ? new Set(saved.selectedSpecialties) : new Set();
  elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = specialties.has(input.value);
  });
}

function restoreOwnedIds() {
  const savedIds = readStorage(STORAGE_KEYS.ownedIds, null);
  const fallbackGroupIds = readStorage(STORAGE_KEYS.groupIds, []);
  const ids = Array.isArray(savedIds) ? savedIds : fallbackGroupIds;
  state.ownedIds = ids.filter((id) => typeof id === 'string' && state.pokemonById.has(id));
}

function restoreTeamIds() {
  const savedIds = readStorage(STORAGE_KEYS.teamIds, null);
  const fallbackGroupIds = readStorage(STORAGE_KEYS.groupIds, []);
  const ids = Array.isArray(savedIds) ? savedIds : fallbackGroupIds;
  state.teamIds = ids.filter((id) => typeof id === 'string' && state.pokemonById.has(id));
  state.teamIds = state.teamIds.filter((id) => state.ownedIds.includes(id));
}

function saveOwnedIds() {
  writeStorage(STORAGE_KEYS.ownedIds, state.ownedIds);
}

function saveTeamIds() {
  writeStorage(STORAGE_KEYS.teamIds, state.teamIds);
  writeStorage(STORAGE_KEYS.groupIds, state.teamIds);
}

function applyPersonalization() {
  const trainerName = String(state.personalization.trainerName || '').trim();
  const plannerTitle = String(state.personalization.plannerTitle || '').trim();

  elements.trainerName.value = trainerName;
  elements.plannerTitle.value = plannerTitle;
  elements.personalNotes.value = String(state.personalization.personalNotes || '');
  elements.heroEyebrow.textContent = trainerName ? `${trainerName}'s Pokopia HQ` : 'Pokopia Group Planner';
  elements.heroTitle.textContent = plannerTitle || 'A complete redesign for building elite Pokopia groups.';
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
    : 'Could not save browser details, but the screen still updated.';
}

function resetPersonalization() {
  state.personalization = { ...DEFAULT_PERSONALIZATION };
  applyPersonalization();
  const saved = writeStorage(STORAGE_KEYS.personalization, state.personalization);
  elements.personalizationStatus.textContent = saved ? 'Planner details reset.' : 'Details reset on screen, but storage could not be updated.';
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

  const specialties = unique(state.sortedPokemon.flatMap((pokemon) => pokemon.specialties)).sort((a, b) => a.localeCompare(b));
  elements.requiredSpecialtiesBox.innerHTML = '';

  specialties.forEach((specialty, index) => {
    const id = `spec_${index}`;
    const label = document.createElement('label');
    label.className = 'check-item';
    label.htmlFor = id;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = specialty;

    const text = document.createElement('span');
    text.textContent = specialty;

    label.appendChild(input);
    label.appendChild(text);
    elements.requiredSpecialtiesBox.appendChild(label);
  });

  updateSpecialtiesHint();
}

function getSelectedSpecialtiesNormalized() {
  return [...elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => normalizeText(input.value))
    .filter(Boolean);
}

function getCurrentRequirements() {
  return {
    requiredHabitatNorm: normalizeText(elements.requiredHabitat.value),
    requiredSpecialtiesNorm: getSelectedSpecialtiesNormalized(),
  };
}

function updateSpecialtiesHint() {
  const selected = [...elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );
  elements.specialtiesHint.textContent = selected.length ? `Filtering to: ${selected.join(', ')}` : 'Showing all specialties';
}

function getFilteredCatalogPokemon() {
  const query = normalizeText(elements.catalogSearch.value).replace(/^#/, '');
  if (!query) {
    return state.sortedPokemon;
  }
  return state.sortedPokemon.filter((pokemon) => pokemon.searchText.includes(query));
}

function updateCatalogSelectionCount() {
  const count = elements.catalogList.querySelectorAll("input[type='checkbox']:checked").length;
  elements.catalogSelectionCount.textContent = `${count} selected`;
  elements.addCatalogSelection.disabled = count === 0;
}

function renderCatalogList() {
  const filteredPokemon = getFilteredCatalogPokemon();
  state.filteredCatalogIds = filteredPokemon.map((pokemon) => pokemon.id);
  const selected = new Set([...elements.catalogList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value));
  const ownedSet = new Set(state.ownedIds);
  elements.catalogList.innerHTML = '';

  if (!filteredPokemon.length) {
    elements.catalogList.innerHTML = '<div class="empty-inline">No Pokémon match this catalog search.</div>';
    updateCatalogSelectionCount();
    return;
  }

  for (const pokemon of filteredPokemon) {
    const card = document.createElement('label');
    card.className = 'catalog-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = pokemon.id;
    checkbox.checked = selected.has(pokemon.id);

    const info = document.createElement('div');
    info.className = 'catalog-item-body';
    info.innerHTML = `
      <div class="catalog-title-row">
        <strong>${pokemon.label}</strong>
        <span class="ownership-badge ${ownedSet.has(pokemon.id) ? 'owned' : 'unowned'}">${ownedSet.has(pokemon.id) ? 'Owned' : 'Not owned'}</span>
      </div>
      <p><strong>Habitat:</strong> ${pokemon.idealHabitat || 'Unknown'}</p>
      <p><strong>Specialties:</strong> ${listToText(pokemon.specialties)}</p>
      <p><strong>Favorites:</strong> ${listToText(pokemon.favorites.slice(0, 3))}${pokemon.favorites.length > 3 ? ', …' : ''}</p>
    `;

    card.appendChild(checkbox);
    card.appendChild(info);
    elements.catalogList.appendChild(card);
  }

  updateCatalogSelectionCount();
}

function addOwnedPokemonById(id) {
  if (!id || state.ownedIds.includes(id) || !state.pokemonById.has(id)) {
    return false;
  }
  state.ownedIds.push(id);
  return true;
}

function addOwnedPokemonByIds(ids) {
  let added = 0;
  for (const id of ids) {
    if (addOwnedPokemonById(id)) {
      added += 1;
    }
  }

  if (added > 0) {
    state.ownedIds.sort((a, b) => {
      const aPokemon = state.pokemonById.get(a);
      const bPokemon = state.pokemonById.get(b);
      const aDex = Number.isInteger(aPokemon?.dexNumber) ? aPokemon.dexNumber : 9999;
      const bDex = Number.isInteger(bPokemon?.dexNumber) ? bPokemon.dexNumber : 9999;
      if (aDex !== bDex) {
        return aDex - bDex;
      }
      return String(aPokemon?.name || '').localeCompare(String(bPokemon?.name || ''));
    });
    saveOwnedIds();
    refreshAllViews();
  }

  return added;
}

function removeOwnedPokemonById(id) {
  const nextOwned = state.ownedIds.filter((ownedId) => ownedId !== id);
  if (nextOwned.length === state.ownedIds.length) {
    return;
  }

  state.ownedIds = nextOwned;
  state.teamIds = state.teamIds.filter((teamId) => teamId !== id);
  saveOwnedIds();
  saveTeamIds();
  refreshAllViews();
}

function clearOwnedDex() {
  if (!state.ownedIds.length) {
    return;
  }
  state.ownedIds = [];
  state.teamIds = [];
  saveOwnedIds();
  saveTeamIds();
  refreshAllViews();
  elements.importFeedback.textContent = 'Owned Pokédex cleared. Your active squad was cleared too.';
}

function addPokemonToTeam(id) {
  if (!id || state.teamIds.includes(id) || !state.ownedIds.includes(id)) {
    return false;
  }
  state.teamIds.push(id);
  saveTeamIds();
  refreshAllViews();
  return true;
}

function removePokemonFromTeam(id) {
  const next = state.teamIds.filter((teamId) => teamId !== id);
  if (next.length === state.teamIds.length) {
    return;
  }
  state.teamIds = next;
  saveTeamIds();
  refreshAllViews();
}

function clearTeam() {
  if (!state.teamIds.length) {
    return;
  }
  state.teamIds = [];
  saveTeamIds();
  refreshAllViews();
}

function getFilteredOwnedPokemon() {
  const query = normalizeText(elements.ownedSearch.value).replace(/^#/, '');
  const teamSet = new Set(state.teamIds);
  const ownedPokemon = getOwnedPokemon();

  return ownedPokemon.filter((pokemon) => {
    if (teamSet.has(pokemon.id)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return pokemon.searchText.includes(query);
  });
}

function renderOwnedDex() {
  const ownedPokemon = getOwnedPokemon();
  const filtered = getFilteredOwnedPokemon();
  state.filteredOwnedIds = filtered.map((pokemon) => pokemon.id);
  elements.ownedDexList.innerHTML = '';
  elements.ownedDexEmpty.classList.toggle('hidden', ownedPokemon.length > 0);
  elements.ownedSearchSummary.textContent = `${filtered.length} available`;

  if (!ownedPokemon.length) {
    return;
  }

  if (!filtered.length) {
    elements.ownedDexList.innerHTML = '<div class="empty-inline">No owned Pokémon match this search, or they are already in the squad.</div>';
    return;
  }

  for (const pokemon of filtered) {
    const card = document.createElement('article');
    card.className = 'owned-card';
    card.innerHTML = `
      <div class="owned-card-head">
        <div>
          <p class="owned-card-name">${pokemon.label}</p>
          <p class="owned-card-meta">Habitat: ${pokemon.idealHabitat || 'Unknown'} · Specialties: ${listToText(pokemon.specialties)}</p>
        </div>
        <span class="ownership-badge owned">Owned</span>
      </div>
      <p class="owned-card-favorites">Favorites: ${listToText(pokemon.favorites.slice(0, 4))}${pokemon.favorites.length > 4 ? ', …' : ''}</p>
      <div class="owned-card-actions">
        <button type="button" class="add-to-team" data-id="${pokemon.id}">Add to squad</button>
        <button type="button" class="ghost remove-owned" data-id="${pokemon.id}">Remove from Pokédex</button>
      </div>
    `;
    elements.ownedDexList.appendChild(card);
  }
}

function renderTeam() {
  const members = getTeamMembers();
  elements.teamList.innerHTML = '';
  elements.teamEmpty.classList.toggle('hidden', members.length > 0);

  if (!members.length) {
    elements.toggleOverlap.disabled = true;
    if (state.groupOverlapVisible) {
      setOverlapPanelVisibility(false);
    }
    return;
  }

  for (const member of members) {
    const li = document.createElement('li');
    li.className = 'team-item';
    li.innerHTML = `
      <div class="team-item-main">
        <div class="team-item-top">
          <strong>${member.label}</strong>
          <span class="chip">${member.idealHabitat || 'Unknown habitat'}</span>
        </div>
        <p><strong>Specialties:</strong> ${listToText(member.specialties)}</p>
        <p><strong>Favorites:</strong> ${listToText(member.favorites)}</p>
      </div>
      <button type="button" class="ghost remove-team" data-id="${member.id}">Remove</button>
    `;
    elements.teamList.appendChild(li);
  }

  elements.toggleOverlap.disabled = false;
}

function renderTeamInsights(groupMembers = getTeamMembers()) {
  const importanceRatio = getImportanceRatio();
  const summary = computeGroupScoreSummary(groupMembers, importanceRatio);
  elements.groupTotalStacked.textContent = summary.stackedCombined.toFixed(2);
  elements.groupTotalSimple.textContent = summary.simpleCombined.toFixed(2);

  renderOverlapList(elements.habitatOverlapList, summary.habitat.overlapRows, 'No shared habitat yet.');
  renderOverlapList(elements.favoritesOverlapList, summary.favorites.overlapRows, 'No shared favorites yet.');

  const topHabitat = summary.habitat.overlapRows[0];
  elements.habitatOverlapMeta.textContent = topHabitat
    ? `Top overlap: ${topHabitat.label} (${topHabitat.count} squad members). Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`
    : `No shared habitat in the current squad. Conflicting habitat pairs: ${summary.habitat.conflictPairs}.`;

  const topFavorite = summary.favorites.overlapRows[0];
  elements.favoritesOverlapMeta.textContent = topFavorite
    ? `Top overlap: ${topFavorite.label} (${topFavorite.count} squad members).`
    : 'No shared favorites in the current squad.';
}

function candidateMatchesRequirements(candidate, requirements) {
  if (requirements.requiredHabitatNorm && candidate.idealHabitatNorm !== requirements.requiredHabitatNorm) {
    return false;
  }

  if (requirements.requiredSpecialtiesNorm.length > 0) {
    return requirements.requiredSpecialtiesNorm.some((specialty) => candidate.specialtiesNorm.has(specialty));
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

function updateSpotlight(topRow) {
  if (!topRow) {
    elements.topRecommendationSpotlight.classList.add('hidden');
    elements.topRecommendationScore.textContent = '—';
    elements.topRecommendationName.textContent = 'No recommendation yet';
    return;
  }

  elements.topRecommendationSpotlight.classList.remove('hidden');
  elements.topRecommendationScore.textContent = topRow.combinedScore.toFixed(2);
  elements.topRecommendationName.textContent = `${topRow.candidate.label} · ${topRow.owned ? 'Owned' : 'Unowned option'}`;
  elements.spotlightName.textContent = topRow.candidate.label;
  elements.spotlightSummary.textContent = `${topRow.owned ? 'Owned pick' : 'Outside option'} with habitat ${topRow.candidate.idealHabitat || 'Unknown'}, ${topRow.favoritesScore} favorites overlap points, and shared favorites: ${topRow.sharedFavoriteNames.length ? topRow.sharedFavoriteNames.join(', ') : 'none'}.`;
}

function runRecommendation() {
  const teamMembers = getTeamMembers();
  const ownedSet = new Set(state.ownedIds);
  const teamSet = new Set(state.teamIds);
  const requirements = getCurrentRequirements();
  const limit = Number(elements.resultCount.value);
  const importanceRatio = getImportanceRatio();
  const ownedOnly = getOwnedOnlyMode();
  const rows = [];

  for (const candidate of state.sortedPokemon) {
    if (teamSet.has(candidate.id)) {
      continue;
    }
    if (ownedOnly && !ownedSet.has(candidate.id)) {
      continue;
    }
    if (!candidateMatchesRequirements(candidate, requirements)) {
      continue;
    }

    const score = scoreCandidate(candidate, teamMembers, importanceRatio);
    rows.push({
      candidate,
      owned: ownedSet.has(candidate.id),
      ...score,
      sharedFavoriteNames: getSharedFavoriteNames(candidate, teamMembers),
    });
  }

  rows.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    if (a.owned !== b.owned) {
      return Number(b.owned) - Number(a.owned);
    }
    if (b.favoritesScore !== a.favoritesScore) {
      return b.favoritesScore - a.favoritesScore;
    }
    if (b.habitatScore !== a.habitatScore) {
      return b.habitatScore - a.habitatScore;
    }
    return a.candidate.label.localeCompare(b.candidate.label);
  });

  state.lastRecommendationRows = rows;
  const topRows = rows.slice(0, limit);
  elements.resultsBody.innerHTML = '';

  if (!topRows.length) {
    elements.resultsBody.innerHTML = '<tr><td colspan="10" class="table-empty">No recommendations match the current filters.</td></tr>';
  }

  for (const [index, row] of topRows.entries()) {
    const tr = document.createElement('tr');
    const actionLabel = row.owned ? 'Add to squad' : 'Add to Pokédex';
    tr.innerHTML = `
      <td data-label="Rank">${index + 1}</td>
      <td data-label="Pokémon">${row.candidate.label}</td>
      <td data-label="Ownership"><span class="ownership-badge ${row.owned ? 'owned' : 'unowned'}">${row.owned ? 'Owned' : 'Unowned'}</span></td>
      <td data-label="Habitat">${row.candidate.idealHabitat || 'Unknown'}</td>
      <td data-label="Combined"><strong>${row.combinedScore.toFixed(2)}</strong></td>
      <td data-label="Habitat">${row.habitatScore}</td>
      <td data-label="Favorites">${row.favoritesScore}</td>
      <td data-label="Shared favorites">${row.sharedFavoriteNames.length ? row.sharedFavoriteNames.join(', ') : '—'}</td>
      <td data-label="Specialties">${listToText(row.candidate.specialties)}</td>
      <td data-label="Action"><button type="button" class="tiny recommendation-action" data-id="${row.candidate.id}" data-owned="${row.owned}">${actionLabel}</button></td>
    `;
    elements.resultsBody.appendChild(tr);
  }

  updateSpotlight(topRows[0]);
  renderTeamInsights(teamMembers);
  updateDashboard(topRows[0], rows.length);
  elements.status.textContent = `${topRows.length} shown out of ${rows.length} matching candidates.`;
  saveRequirements();
}

function updateDashboard(topRow, totalMatches) {
  const totalPokemon = state.sortedPokemon.length || 1;
  const ownedCount = state.ownedIds.length;
  const teamCount = state.teamIds.length;
  const ownedOnly = getOwnedOnlyMode();
  const coverage = ((ownedCount / totalPokemon) * 100).toFixed(1);

  elements.ownedCountHero.textContent = String(ownedCount);
  elements.teamCountHero.textContent = String(teamCount);
  elements.recommendationModeHero.textContent = ownedOnly ? 'Owned only' : 'Owned + unowned';
  elements.ownedCountStat.textContent = String(ownedCount);
  elements.ownedCoverageStat.textContent = `${coverage}% of all Pokopia Pokémon`;
  elements.teamCountStat.textContent = String(teamCount);
  elements.teamSummaryStat.textContent = teamCount ? `${teamCount} Pokémon in the current squad` : 'Add owned Pokémon to start building';
  elements.recommendationModeStat.textContent = ownedOnly ? 'Owned only' : 'Expanded scouting';
  elements.unownedVisibleStat.textContent = ownedOnly ? 'Unowned recommendations hidden' : 'Unowned recommendations visible';

  if (!ownedCount) {
    elements.plannerInsight.textContent = 'Import your owned Pokémon first so the planner can stop suggesting things you do not actually have.';
  } else if (!teamCount) {
    elements.plannerInsight.textContent = 'Your owned Pokédex is ready. Now build an active squad from that pool to unlock tailored recommendations.';
  } else if (ownedOnly) {
    elements.plannerInsight.textContent = `You are seeing ${totalMatches} recommendation candidates from your owned Pokédex only.`;
  } else {
    elements.plannerInsight.textContent = `Expanded mode is active. You are seeing ${totalMatches} candidates from both owned and unowned Pokémon.`;
  }

  if (!topRow) {
    elements.topRecommendationScore.textContent = '—';
    elements.topRecommendationName.textContent = ownedCount ? 'No recommendation matches filters' : 'Import Pokémon to begin';
  }
}

function refreshAllViews() {
  renderCatalogList();
  renderOwnedDex();
  renderTeam();
  runRecommendation();
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

  const added = addOwnedPokemonByIds(matchedIds);
  const parts = [`Read ${lines.length} lines.`, `Added ${added} Pokémon to your owned Pokédex.`];

  if (missing.length) {
    parts.push(`Could not match: ${missing.join(', ')}.`);
  }
  if (!matchedIds.length) {
    parts.push('Use an exact Pokémon name or dex number on each line.');
  }

  elements.importFeedback.textContent = parts.join(' ');
}

async function readClipboardIntoTextarea() {
  if (!navigator.clipboard?.readText) {
    elements.importFeedback.textContent = 'Clipboard paste is not available in this browser. Paste manually instead.';
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    elements.pasteImport.value = text;
    importPokemonListFromText(text);
  } catch (error) {
    console.error(error);
    elements.importFeedback.textContent = 'Clipboard access failed. Paste into the textarea manually instead.';
  }
}

function clearSpecialtiesSelection() {
  elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked").forEach((input) => {
    input.checked = false;
  });
  updateSpecialtiesHint();
  runRecommendation();
}

function setVisibleCatalogSelection(checked) {
  elements.catalogList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = checked;
  });
  updateCatalogSelectionCount();
}

function addSelectedCatalogPokemon() {
  const ids = [...elements.catalogList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
  if (!ids.length) {
    elements.importFeedback.textContent = 'Select Pokémon from the catalog before adding them.';
    return;
  }

  const added = addOwnedPokemonByIds(ids);
  elements.importFeedback.textContent = added
    ? `Added ${added} Pokémon to your owned Pokédex.`
    : 'Those Pokémon were already in your owned Pokédex.';
}

function handleRecommendationAction(button) {
  const id = button.dataset.id;
  const isOwned = button.dataset.owned === 'true';

  if (isOwned) {
    const added = addPokemonToTeam(id);
    elements.importFeedback.textContent = added
      ? 'Added the recommended owned Pokémon to your squad.'
      : 'That Pokémon is already in your squad.';
    return;
  }

  addOwnedPokemonByIds([id]);
  const addedToTeam = addPokemonToTeam(id);
  elements.importFeedback.textContent = addedToTeam
    ? 'Added the recommended Pokémon to your owned Pokédex and squad.'
    : 'Added the recommended Pokémon to your owned Pokédex.';
}

function bindEvents() {
  elements.savePersonalization.addEventListener('click', savePersonalization);
  elements.resetPersonalization.addEventListener('click', resetPersonalization);

  elements.jumpToImport.addEventListener('click', () => {
    elements.importSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.jumpToRecommendations.addEventListener('click', () => {
    elements.recommendationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.catalogSearch.addEventListener('input', renderCatalogList);
  elements.catalogList.addEventListener('change', (event) => {
    if (event.target.matches("input[type='checkbox']")) {
      updateCatalogSelectionCount();
    }
  });
  elements.selectAllVisibleCatalog.addEventListener('click', () => setVisibleCatalogSelection(true));
  elements.clearVisibleCatalog.addEventListener('click', () => setVisibleCatalogSelection(false));
  elements.addCatalogSelection.addEventListener('click', addSelectedCatalogPokemon);
  elements.clearOwnedDex.addEventListener('click', clearOwnedDex);

  elements.readClipboard.addEventListener('click', readClipboardIntoTextarea);
  elements.importPokemonList.addEventListener('click', () => importPokemonListFromText(elements.pasteImport.value));

  elements.ownedSearch.addEventListener('input', renderOwnedDex);
  elements.ownedDexList.addEventListener('click', (event) => {
    const addButton = event.target.closest('button.add-to-team');
    if (addButton) {
      const added = addPokemonToTeam(addButton.dataset.id);
      elements.importFeedback.textContent = added ? 'Added Pokémon to your squad.' : 'That Pokémon is already in your squad.';
      return;
    }

    const removeOwnedButton = event.target.closest('button.remove-owned');
    if (removeOwnedButton) {
      removeOwnedPokemonById(removeOwnedButton.dataset.id);
      elements.importFeedback.textContent = 'Removed Pokémon from your owned Pokédex.';
    }
  });

  elements.clearTeam.addEventListener('click', clearTeam);
  elements.teamList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button.remove-team');
    if (!removeButton) {
      return;
    }
    removePokemonFromTeam(removeButton.dataset.id);
  });

  elements.toggleOverlap.addEventListener('click', () => {
    if (elements.toggleOverlap.disabled) {
      return;
    }
    setOverlapPanelVisibility(!state.groupOverlapVisible);
  });

  elements.ownedOnlyToggle.addEventListener('change', runRecommendation);
  elements.requiredHabitat.addEventListener('change', runRecommendation);
  elements.resultCount.addEventListener('change', runRecommendation);
  elements.importanceRatio.addEventListener('input', () => {
    updateImportanceRatioLabel();
    runRecommendation();
  });
  elements.clearSpecialties.addEventListener('click', clearSpecialtiesSelection);
  elements.requiredSpecialtiesBox.addEventListener('change', () => {
    updateSpecialtiesHint();
    runRecommendation();
  });

  elements.resultsBody.addEventListener('click', (event) => {
    const button = event.target.closest('button.recommendation-action');
    if (!button) {
      return;
    }
    handleRecommendationAction(button);
  });
}

async function init() {
  try {
    elements.status.textContent = 'Loading Pokopia data…';
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
    restoreOwnedIds();
    restoreTeamIds();
    updateImportanceRatioLabel();
    bindEvents();
    refreshAllViews();

    elements.status.textContent = `${state.pokemon.length} Pokémon loaded.`;
    elements.personalizationStatus.textContent = 'Planner details, owned Pokédex, squad, and filters are stored only in this browser.';
    setOverlapPanelVisibility(false);
  } catch (error) {
    console.error(error);
    elements.status.textContent = 'Failed to load data. Start a local server and refresh.';
  }
}

init();
