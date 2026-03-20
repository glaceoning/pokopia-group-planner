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
  houses: 'pokopia.houses',
  houseCounter: 'pokopia.houseCounter',
};

const state = {
  pokemon: [],
  sortedPokemon: [],
  pokemonById: new Map(),
  pokemonLookup: new Map(),
  ownedIds: [],
  teamIds: [],
  houses: [],
  houseCounter: 0,
  filteredCatalogIds: [],
  filteredOwnedIds: [],
  groupOverlapVisible: false,
  lastRecommendationRows: [],
  mobileSection: 'overview',
  importCatalogExpanded: false,
  specialtiesExpanded: false,
};

const elements = {
  heroEyebrow: document.querySelector('#heroEyebrow'),
  heroTitle: document.querySelector('#heroTitle'),
  jumpToImport: document.querySelector('#jumpToImport'),
  jumpToHouses: document.querySelector('#jumpToHouses'),
  jumpToRecommendations: document.querySelector('#jumpToRecommendations'),
  importSection: document.querySelector('#importSection'),
  housesSection: document.querySelector('#housesSection'),
  recommendationsSection: document.querySelector('#recommendationsSection'),
  ownedCountHero: document.querySelector('#ownedCountHero'),
  availableCountHero: document.querySelector('#availableCountHero'),
  houseCountHero: document.querySelector('#houseCountHero'),
  teamCountHero: document.querySelector('#teamCountHero'),
  ownedCountStat: document.querySelector('#ownedCountStat'),
  ownedCoverageStat: document.querySelector('#ownedCoverageStat'),
  availableCountStat: document.querySelector('#availableCountStat'),
  availableSummaryStat: document.querySelector('#availableSummaryStat'),
  houseCountStat: document.querySelector('#houseCountStat'),
  houseSummaryStat: document.querySelector('#houseSummaryStat'),
  teamCountStat: document.querySelector('#teamCountStat'),
  teamSummaryStat: document.querySelector('#teamSummaryStat'),
  topRecommendationScore: document.querySelector('#topRecommendationScore'),
  topRecommendationName: document.querySelector('#topRecommendationName'),
  recommendationModeStat: document.querySelector('#recommendationModeStat'),
  unownedVisibleStat: document.querySelector('#unownedVisibleStat'),
  plannerInsight: document.querySelector('#plannerInsight'),
  overviewSection: document.querySelector('#overviewSection'),
  workspaceSection: document.querySelector('#workspaceSection'),
  catalogSearch: document.querySelector('#catalogSearch'),
  catalogList: document.querySelector('#catalogList'),
  catalogSelectionCount: document.querySelector('#catalogSelectionCount'),
  catalogCard: document.querySelector('#catalogCard'),
  catalogContent: document.querySelector('#catalogContent'),
  toggleCatalog: document.querySelector('#toggleCatalog'),
  filterHideOwned: document.querySelector('#filterHideOwned'),
  filterOwnedOnly: document.querySelector('#filterOwnedOnly'),
  filterHideAssigned: document.querySelector('#filterHideAssigned'),
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
  houseNameInput: document.querySelector('#houseNameInput'),
  saveHouse: document.querySelector('#saveHouse'),
  houseSaveFeedback: document.querySelector('#houseSaveFeedback'),
  clearHouses: document.querySelector('#clearHouses'),
  autoHouseName: document.querySelector('#autoHouseName'),
  autoHouseMax: document.querySelector('#autoHouseMax'),
  autoGenerateHouse: document.querySelector('#autoGenerateHouse'),
  autoHouseFeedback: document.querySelector('#autoHouseFeedback'),
  houseRosterSummary: document.querySelector('#houseRosterSummary'),
  housesEmpty: document.querySelector('#housesEmpty'),
  houseList: document.querySelector('#houseList'),
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
  specialtiesCard: document.querySelector('#specialtiesCard'),
  specialtiesContent: document.querySelector('#specialtiesContent'),
  toggleSpecialties: document.querySelector('#toggleSpecialties'),
  specialtiesHint: document.querySelector('#specialtiesHint'),
  resultCount: document.querySelector('#resultCount'),
  importanceRatio: document.querySelector('#importanceRatio'),
  importanceValue: document.querySelector('#importanceValue'),
  topRecommendationSpotlight: document.querySelector('#topRecommendationSpotlight'),
  spotlightName: document.querySelector('#spotlightName'),
  spotlightSummary: document.querySelector('#spotlightSummary'),
  resultsBody: document.querySelector('#resultsBody'),
  status: document.querySelector('#status'),
  mobileSectionNav: document.querySelector('.mobile-section-nav'),
  mobileSectionButtons: [...document.querySelectorAll('.mobile-section-button')],
};

const mobileLayoutQuery = window.matchMedia('(max-width: 900px)');

function getMobileSections() {
  return {
    overview: elements.overviewSection,
    import: elements.importSection,
    squad: elements.workspaceSection,
    houses: elements.housesSection,
    recommendations: elements.recommendationsSection,
  };
}

function isMobileLayout() {
  return mobileLayoutQuery.matches;
}

function syncMobileSectionVisibility() {
  const sections = getMobileSections();
  const mobileEnabled = isMobileLayout();

  document.body.classList.toggle('mobile-sections-active', mobileEnabled);

  for (const [key, section] of Object.entries(sections)) {
    if (!section) {
      continue;
    }
    section.classList.toggle('mobile-hidden-section', mobileEnabled && state.mobileSection !== key);
  }

  elements.mobileSectionButtons.forEach((button) => {
    const active = button.dataset.mobileTarget === state.mobileSection;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setMobileSection(sectionKey, options = {}) {
  if (!getMobileSections()[sectionKey]) {
    return;
  }

  const { scroll = true } = options;
  state.mobileSection = sectionKey;
  syncMobileSectionVisibility();

  if (!isMobileLayout() || !scroll) {
    return;
  }

  getMobileSections()[sectionKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function navigateToSection(sectionKey) {
  const targetSection = getMobileSections()[sectionKey];
  if (!targetSection) {
    return;
  }

  setMobileSection(sectionKey, { scroll: false });
  targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
    const tokens = [pokemon.name, pokemon.label, pokemon.dexPadded, pokemon.dexRaw, `#${pokemon.dexPadded}`, `#${pokemon.dexRaw}`];

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

function getHouseMembers(house) {
  return house.memberIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
}

function getAssignedPokemonIdsSet() {
  return new Set(state.houses.flatMap((house) => house.memberIds));
}

function getAvailableOwnedIds() {
  const assignedIds = getAssignedPokemonIdsSet();
  return state.ownedIds.filter((id) => !assignedIds.has(id));
}

function getAvailableOwnedPokemon() {
  return getAvailableOwnedIds().map((id) => state.pokemonById.get(id)).filter(Boolean);
}

function getRecommendationEligibleIds() {
  const assignedIds = getAssignedPokemonIdsSet();
  return state.sortedPokemon.map((pokemon) => pokemon.id).filter((id) => !assignedIds.has(id));
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

function toggleCollapsible(card, content, toggle, expanded, labels = { expanded: 'Collapse', collapsed: 'Expand' }) {
  if (!card || !content || !toggle) {
    return;
  }

  card.classList.toggle('collapsed', !expanded);
  card.classList.toggle('expanded', expanded);
  content.classList.toggle('hidden', !expanded);
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggle.textContent = expanded ? labels.expanded : labels.collapsed;
}

function syncCatalogCollapse() {
  toggleCollapsible(elements.catalogCard, elements.catalogContent, elements.toggleCatalog, state.importCatalogExpanded);
}

function syncSpecialtiesCollapse() {
  toggleCollapsible(elements.specialtiesCard, elements.specialtiesContent, elements.toggleSpecialties, state.specialtiesExpanded);
}

function formatHouseNumber(value) {
  return String(value).padStart(3, '0');
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

function buildHouseRating(summary) {
  const stacked = summary.stackedCombined;
  if (stacked >= 14) {
    return 'S';
  }
  if (stacked >= 9) {
    return 'A';
  }
  if (stacked >= 5) {
    return 'B';
  }
  if (stacked >= 2) {
    return 'C';
  }
  return 'D';
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

function sanitizeHouse(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const memberIds = Array.isArray(raw.memberIds)
    ? unique(raw.memberIds.filter((id) => typeof id === 'string' && state.pokemonById.has(id) && state.ownedIds.includes(id)))
    : [];

  if (!memberIds.length) {
    return null;
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `house-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(raw.name || '').trim() || formatHouseNumber(state.houses.length + 1),
    memberIds,
    stackedScore: Number.isFinite(raw.stackedScore) ? raw.stackedScore : 0,
    simpleScore: Number.isFinite(raw.simpleScore) ? raw.simpleScore : 0,
    rating: String(raw.rating || '').trim() || 'D',
    createdAt: String(raw.createdAt || new Date().toISOString()),
    source: raw.source === 'auto' ? 'auto' : 'manual',
    sizeRange: raw.sizeRange && typeof raw.sizeRange === 'object' ? raw.sizeRange : null,
    sequence: Number.isInteger(raw.sequence) && raw.sequence > 0 ? raw.sequence : state.houses.length + 1,
  };
}

function restoreHouses() {
  const rawHouses = readStorage(STORAGE_KEYS.houses, []);
  const seen = new Set();
  state.houses = [];

  if (!Array.isArray(rawHouses)) {
    return;
  }

  for (const rawHouse of rawHouses) {
    const house = sanitizeHouse(rawHouse);
    if (!house) {
      continue;
    }

    if (house.memberIds.some((id) => seen.has(id))) {
      continue;
    }

    house.memberIds.forEach((id) => seen.add(id));
    state.houses.push(house);
  }
}

function restoreTeamIds() {
  const savedIds = readStorage(STORAGE_KEYS.teamIds, null);
  const fallbackGroupIds = readStorage(STORAGE_KEYS.groupIds, []);
  const ids = Array.isArray(savedIds) ? savedIds : fallbackGroupIds;
  const assignedIds = getAssignedPokemonIdsSet();
  state.teamIds = ids.filter((id) => typeof id === 'string' && state.pokemonById.has(id));
  state.teamIds = state.teamIds.filter((id) => state.ownedIds.includes(id) && !assignedIds.has(id));
}

function restoreHouseCounter() {
  const raw = readStorage(STORAGE_KEYS.houseCounter, 0);
  state.houseCounter = Number.isInteger(raw) ? raw : 0;
}

function saveOwnedIds() {
  writeStorage(STORAGE_KEYS.ownedIds, state.ownedIds);
}

function saveTeamIds() {
  writeStorage(STORAGE_KEYS.teamIds, state.teamIds);
  writeStorage(STORAGE_KEYS.groupIds, state.teamIds);
}

function saveHouses() {
  writeStorage(STORAGE_KEYS.houses, state.houses);
  writeStorage(STORAGE_KEYS.houseCounter, state.houseCounter);
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
  const ownedSet = new Set(state.ownedIds);
  const assignedSet = getAssignedPokemonIdsSet();

  return state.sortedPokemon.filter((pokemon) => {
    if (elements.filterHideOwned.checked && ownedSet.has(pokemon.id)) {
      return false;
    }
    if (elements.filterOwnedOnly.checked && !ownedSet.has(pokemon.id)) {
      return false;
    }
    if (elements.filterHideAssigned.checked && assignedSet.has(pokemon.id)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return pokemon.searchText.includes(query);
  });
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
  const assignedSet = getAssignedPokemonIdsSet();
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

    const ownershipLabel = ownedSet.has(pokemon.id) ? (assignedSet.has(pokemon.id) ? 'In House' : 'Owned') : 'Not owned';
    const ownershipClass = ownedSet.has(pokemon.id) ? 'owned' : 'unowned';

    const info = document.createElement('div');
    info.className = 'catalog-item-body';
    info.innerHTML = `
      <div class="catalog-title-row">
        <strong>${pokemon.label}</strong>
        <span class="ownership-badge ${ownershipClass}">${ownershipLabel}</span>
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

function sortOwnedIds() {
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
    sortOwnedIds();
    saveOwnedIds();
    refreshAllViews();
  }

  return added;
}

function removeOwnedPokemonById(id) {
  const assignedIds = getAssignedPokemonIdsSet();
  if (assignedIds.has(id)) {
    elements.importFeedback.textContent = 'Release the House containing that Pokémon before removing it from your Pokédex.';
    return;
  }

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
  if (!state.ownedIds.length && !state.houses.length && !state.teamIds.length) {
    return;
  }

  if (!window.confirm('Clear your owned list, active squad, and all saved Houses?')) {
    return;
  }
  state.ownedIds = [];
  state.teamIds = [];
  state.houses = [];
  state.houseCounter = 0;
  saveOwnedIds();
  saveTeamIds();
  saveHouses();
  refreshAllViews();
  elements.importFeedback.textContent = 'Owned list, Houses, and active squad cleared.';
}

function addPokemonToTeam(id) {
  const assignedIds = getAssignedPokemonIdsSet();
  if (!id || state.teamIds.includes(id) || !state.ownedIds.includes(id) || assignedIds.has(id)) {
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

  if (!window.confirm('Clear the current active squad?')) {
    return;
  }
  state.teamIds = [];
  saveTeamIds();
  refreshAllViews();
}

function getFilteredOwnedPokemon() {
  const query = normalizeText(elements.ownedSearch.value).replace(/^#/, '');
  const teamSet = new Set(state.teamIds);
  const ownedPokemon = getAvailableOwnedPokemon();

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
  const availableOwnedPokemon = getAvailableOwnedPokemon();
  const filtered = getFilteredOwnedPokemon();
  state.filteredOwnedIds = filtered.map((pokemon) => pokemon.id);
  elements.ownedDexList.innerHTML = '';
  elements.ownedDexEmpty.classList.toggle('hidden', availableOwnedPokemon.length > 0);
  elements.ownedSearchSummary.textContent = `${filtered.length} available`;

  if (!availableOwnedPokemon.length) {
    return;
  }

  if (!filtered.length) {
    elements.ownedDexList.innerHTML = '<div class="empty-inline">No available Pokémon match this search, or they are already in the active squad.</div>';
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
        <span class="ownership-badge owned">Available</span>
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
  elements.saveHouse.disabled = members.length === 0;

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

  return summary;
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
  const sharedFavorites = topRow.sharedFavoriteNames.length ? topRow.sharedFavoriteNames.join(', ') : 'none';
  elements.spotlightSummary.textContent = `${topRow.owned ? 'Owned' : 'Unowned'} · Habitat ${topRow.candidate.idealHabitat || 'Unknown'} · Favorites ${topRow.favoritesScore} · Shared ${sharedFavorites}`;
}

function runRecommendation() {
  const teamMembers = getTeamMembers();
  const ownedSet = new Set(state.ownedIds);
  const teamSet = new Set(state.teamIds);
  const eligibleSet = new Set(getRecommendationEligibleIds());
  const requirements = getCurrentRequirements();
  const limit = Number(elements.resultCount.value);
  const importanceRatio = getImportanceRatio();
  const ownedOnly = getOwnedOnlyMode();
  const rows = [];

  for (const candidate of state.sortedPokemon) {
    if (!eligibleSet.has(candidate.id) || teamSet.has(candidate.id)) {
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
    const actionLabel = row.owned ? 'Add to squad' : 'Add to Pokédex';
    const tr = document.createElement('tr');
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

function getHouseDisplayName(house) {
  return house.name || formatHouseNumber(house.sequence || 1);
}

function buildDefaultHouseName() {
  state.houseCounter += 1;
  saveHouses();
  return formatHouseNumber(state.houseCounter);
}

function createHouseRecord({ name, memberIds, source, sizeRange }) {
  const members = memberIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
  const summary = computeGroupScoreSummary(members, getImportanceRatio());
  return {
    id: `house-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || '').trim() || buildDefaultHouseName(),
    memberIds: [...memberIds],
    stackedScore: summary.stackedCombined,
    simpleScore: summary.simpleCombined,
    rating: buildHouseRating(summary),
    createdAt: new Date().toISOString(),
    source,
    sizeRange: sizeRange || null,
    sequence: state.houseCounter,
  };
}

function saveCurrentTeamAsHouse() {
  const memberIds = [...state.teamIds];
  if (!memberIds.length) {
    elements.houseSaveFeedback.textContent = 'Add Pokémon to the active squad before saving a House.';
    return;
  }

  const house = createHouseRecord({
    name: elements.houseNameInput.value,
    memberIds,
    source: 'manual',
  });

  state.houses.unshift(house);
  state.teamIds = [];
  saveHouses();
  saveTeamIds();
  elements.houseNameInput.value = '';
  elements.houseSaveFeedback.textContent = `${getHouseDisplayName(house)} saved. ${house.memberIds.length} Pokémon are now locked into that House.`;
  refreshAllViews();
  setMobileSection('houses', { scroll: true });
}

function releaseHouseById(id) {
  const nextHouses = state.houses.filter((house) => house.id !== id);
  if (nextHouses.length === state.houses.length) {
    return;
  }

  state.houses = nextHouses;
  saveHouses();
  refreshAllViews();
}

function clearHouses() {
  if (!state.houses.length) {
    elements.autoHouseFeedback.textContent = 'There are no Houses to release.';
    return;
  }

  if (!window.confirm('Release all saved Houses and make their Pokémon available again?')) {
    return;
  }

  state.houses = [];
  saveHouses();
  refreshAllViews();
  elements.autoHouseFeedback.textContent = 'All Houses released. Their Pokémon are available again.';
}

function evaluateHouseCandidate(memberIds) {
  const members = memberIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
  const summary = computeGroupScoreSummary(members, getImportanceRatio());
  const habitatRows = summary.habitat.overlapRows.length;
  const favoriteRows = summary.favorites.overlapRows.length;

  return {
    memberIds,
    members,
    summary,
    heuristic: summary.stackedCombined + summary.simpleCombined * 0.35 + habitatRows * 0.25 + favoriteRows * 0.25,
  };
}

function compareHouseCandidates(a, b) {
  if (b.heuristic !== a.heuristic) {
    return b.heuristic - a.heuristic;
  }
  if (b.summary.stackedCombined !== a.summary.stackedCombined) {
    return b.summary.stackedCombined - a.summary.stackedCombined;
  }
  if (b.summary.simpleCombined !== a.summary.simpleCombined) {
    return b.summary.simpleCombined - a.summary.simpleCombined;
  }
  if (b.memberIds.length !== a.memberIds.length) {
    return b.memberIds.length - a.memberIds.length;
  }
  return a.members.map((member) => member.label).join('|').localeCompare(b.members.map((member) => member.label).join('|'));
}

function isBetterHouseCandidate(candidate, incumbent) {
  if (!incumbent) {
    return true;
  }
  return compareHouseCandidates(candidate, incumbent) < 0;
}

function generateBestHouseFromRange(maxSize) {
  const minSize = 2;
  const availablePool = getAvailableOwnedPokemon().filter((pokemon) => !state.teamIds.includes(pokemon.id));
  if (availablePool.length < minSize) {
    return null;
  }

  let bestCandidate = null;

  for (const seed of availablePool) {
    let group = [seed];
    const remainingIds = new Set(availablePool.filter((pokemon) => pokemon.id !== seed.id).map((pokemon) => pokemon.id));

    if (group.length >= minSize) {
      const evaluatedSeed = evaluateHouseCandidate(group.map((member) => member.id));
      if (isBetterHouseCandidate(evaluatedSeed, bestCandidate)) {
        bestCandidate = evaluatedSeed;
      }
    }

    while (group.length < maxSize && remainingIds.size > 0) {
      let bestNextEvaluation = null;
      let bestNextId = null;

      for (const id of remainingIds) {
        const nextMembers = [...group, state.pokemonById.get(id)].filter(Boolean);
        const evaluated = evaluateHouseCandidate(nextMembers.map((member) => member.id));
        if (isBetterHouseCandidate(evaluated, bestNextEvaluation)) {
          bestNextEvaluation = evaluated;
          bestNextId = id;
        }
      }

      if (!bestNextId) {
        break;
      }

      group.push(state.pokemonById.get(bestNextId));
      remainingIds.delete(bestNextId);

      if (group.length >= minSize) {
        const evaluatedGroup = evaluateHouseCandidate(group.map((member) => member.id));
        if (isBetterHouseCandidate(evaluatedGroup, bestCandidate)) {
          bestCandidate = evaluatedGroup;
        }
      }
    }
  }

  return bestCandidate;
}

function normalizeAutoHouseRange() {
  const availableCount = getAvailableOwnedPokemon().filter((pokemon) => !state.teamIds.includes(pokemon.id)).length;
  let maxSize = Number.parseInt(elements.autoHouseMax.value, 10);

  if (!Number.isFinite(maxSize)) {
    maxSize = 4;
  }

  maxSize = Math.max(1, Math.min(10, maxSize));
  maxSize = Math.min(maxSize, availableCount || maxSize);

  elements.autoHouseMax.value = String(maxSize);

  return { maxSize, availableCount };
}

function generateAutoHouse() {
  const { maxSize, availableCount } = normalizeAutoHouseRange();

  if (availableCount < 2) {
    elements.autoHouseFeedback.textContent = 'At least 2 unassigned owned Pokémon are needed to generate a House.';
    return;
  }

  const best = generateBestHouseFromRange(maxSize);
  if (!best) {
    elements.autoHouseFeedback.textContent = 'No valid House could be generated from the current available pool.';
    return;
  }

  const house = createHouseRecord({
    name: elements.autoHouseName.value,
    memberIds: best.memberIds,
    source: 'auto',
    sizeRange: { min: 2, max: maxSize },
  });

  state.houses.unshift(house);
  saveHouses();
  elements.autoHouseName.value = '';
  elements.autoHouseFeedback.textContent = `${getHouseDisplayName(house)} generated with ${house.memberIds.length} Pokémon. Rating ${house.rating}, stacked synergy ${house.stackedScore.toFixed(2)}.`;
  refreshAllViews();
  setMobileSection('houses', { scroll: true });
}

function renderHouses() {
  elements.houseList.innerHTML = '';
  elements.housesEmpty.classList.toggle('hidden', state.houses.length > 0);
  elements.houseRosterSummary.textContent = `${state.houses.length} ${state.houses.length === 1 ? 'House' : 'Houses'}`;
  elements.clearHouses.disabled = state.houses.length === 0;

  if (!state.houses.length) {
    return;
  }

  for (const house of state.houses) {
    const members = getHouseMembers(house);
    const article = document.createElement('article');
    article.className = 'house-card';
    article.innerHTML = `
      <div class="house-card-top">
        <div>
          <p class="house-card-kicker">${house.source === 'auto' ? 'Auto-generated House' : 'Saved from active squad'}</p>
          <h3>${getHouseDisplayName(house)}</h3>
        </div>
        <div class="house-badge-stack">
          <span class="rating-badge">Rating ${house.rating}</span>
          <span class="pill">${members.length} Pokémon</span>
        </div>
      </div>

      <div class="house-score-grid">
        <div class="score-chip">
          <span>Stacked synergy</span>
          <strong>${house.stackedScore.toFixed(2)}</strong>
        </div>
        <div class="score-chip">
          <span>Simple synergy</span>
          <strong>${house.simpleScore.toFixed(2)}</strong>
        </div>
      </div>

      <p class="hint tiny-text">${house.sizeRange ? `Generated with a maximum size of ${house.sizeRange.max} (minimum 2). ` : ''}Created ${new Date(house.createdAt).toLocaleString()}.</p>

      <ul class="house-member-list">
        ${members
          .map(
            (member) => `
            <li>
              <strong>${member.label}</strong>
              <span>${member.idealHabitat || 'Unknown habitat'}</span>
            </li>
          `,
          )
          .join('')}
      </ul>

      <button type="button" class="ghost release-house" data-id="${house.id}">Release House</button>
    `;
    elements.houseList.appendChild(article);
  }
}

function updateDashboard(topRow, totalMatches) {
  const totalPokemon = state.sortedPokemon.length || 1;
  const ownedCount = state.ownedIds.length;
  const availableCount = getAvailableOwnedIds().length;
  const houseCount = state.houses.length;
  const assignedCount = [...getAssignedPokemonIdsSet()].length;
  const teamCount = state.teamIds.length;
  const ownedOnly = getOwnedOnlyMode();
  const coverage = ((ownedCount / totalPokemon) * 100).toFixed(1);

  elements.ownedCountHero.textContent = String(ownedCount);
  elements.availableCountHero.textContent = String(availableCount);
  elements.houseCountHero.textContent = String(houseCount);
  elements.teamCountHero.textContent = String(teamCount);
  elements.ownedCountStat.textContent = String(ownedCount);
  elements.ownedCoverageStat.textContent = `${coverage}% of all Pokopia Pokémon`;
  elements.availableCountStat.textContent = String(availableCount);
  elements.availableSummaryStat.textContent = availableCount ? `${availableCount} unassigned Pokémon ready` : 'No unassigned Pokémon left';
  elements.houseCountStat.textContent = String(houseCount);
  elements.houseSummaryStat.textContent = houseCount ? `${assignedCount} Pokémon locked across Houses` : 'No saved Houses yet';
  elements.teamCountStat.textContent = String(teamCount);
  elements.teamSummaryStat.textContent = teamCount ? `${teamCount} Pokémon in active squad` : 'Add Pokémon to build a squad';
  elements.recommendationModeStat.textContent = ownedOnly ? 'Owned only' : 'All Pokémon';
  elements.unownedVisibleStat.textContent = ownedOnly ? 'Unowned hidden' : 'Unowned visible';

  if (!ownedCount) {
    elements.plannerInsight.textContent = 'Add owned Pokémon to start building.';
  } else if (!availableCount && !teamCount) {
    elements.plannerInsight.textContent = 'All owned Pokémon are currently locked into Houses.';
  } else if (!teamCount) {
    elements.plannerInsight.textContent = 'Choose available Pokémon for the active squad, or auto-generate a House.';
  } else {
    elements.plannerInsight.textContent = `${totalMatches} candidates match the current filters for the active squad.`;
  }

  if (!topRow) {
    elements.topRecommendationScore.textContent = '—';
    elements.topRecommendationName.textContent = ownedCount ? 'No recommendation matches filters' : 'Add Pokémon to begin';
  }
}

function refreshAllViews() {
  renderCatalogList();
  renderOwnedDex();
  renderTeam();
  renderHouses();
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
    elements.importFeedback.textContent = 'Paste at least one Pokémon name to import.';
    return;
  }

  const added = addOwnedPokemonByIds(matchedIds);
  const parts = [`Read ${lines.length} lines.`, `Added ${added} Pokémon to your owned list.`];

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

function addSelectedCatalogPokemon() {
  const ids = [...elements.catalogList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
  if (!ids.length) {
    elements.importFeedback.textContent = 'Select Pokémon from the catalog first.';
    return;
  }

  const added = addOwnedPokemonByIds(ids);
  elements.importFeedback.textContent = added
    ? `Added ${added} Pokémon to your owned list.`
    : 'Those Pokémon were already in your owned list.';
  if (added) {
    setMobileSection('squad', { scroll: true });
  }
}

function handleRecommendationAction(button) {
  const id = button.dataset.id;
  const isOwned = button.dataset.owned === 'true';

  if (isOwned) {
    const added = addPokemonToTeam(id);
    elements.importFeedback.textContent = added
      ? 'Added the recommended Pokémon to your active squad.'
      : 'That Pokémon is already in your squad or locked into a House.';
    if (added) {
      setMobileSection('squad', { scroll: true });
    }
    return;
  }

  addOwnedPokemonByIds([id]);
  const addedToTeam = addPokemonToTeam(id);
  elements.importFeedback.textContent = addedToTeam
    ? 'Added the recommended Pokémon to your owned list and active squad.'
    : 'Added the recommended Pokémon to your owned list.';
  if (addedToTeam) {
    setMobileSection('squad', { scroll: true });
  }
}

function bindEvents() {
  elements.jumpToImport.addEventListener('click', () => {
    navigateToSection('import');
  });
  elements.jumpToHouses.addEventListener('click', () => {
    navigateToSection('houses');
  });
  elements.jumpToRecommendations.addEventListener('click', () => {
    navigateToSection('recommendations');
  });

  elements.mobileSectionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      navigateToSection(button.dataset.mobileTarget);
    });
  });

  const handleMobileLayoutChange = () => syncMobileSectionVisibility();
  if (typeof mobileLayoutQuery.addEventListener === 'function') {
    mobileLayoutQuery.addEventListener('change', handleMobileLayoutChange);
  } else {
    mobileLayoutQuery.addListener(handleMobileLayoutChange);
  }

  elements.catalogSearch.addEventListener('input', renderCatalogList);
  elements.catalogList.addEventListener('change', (event) => {
    if (event.target.matches("input[type='checkbox']")) {
      updateCatalogSelectionCount();
    }
  });
  elements.toggleCatalog.addEventListener('click', () => {
    state.importCatalogExpanded = !state.importCatalogExpanded;
    syncCatalogCollapse();
  });
  [elements.filterHideOwned, elements.filterOwnedOnly, elements.filterHideAssigned].forEach((input) => {
    input.addEventListener('change', renderCatalogList);
  });
  elements.addCatalogSelection.addEventListener('click', addSelectedCatalogPokemon);
  elements.clearOwnedDex.addEventListener('click', clearOwnedDex);

  elements.readClipboard.addEventListener('click', readClipboardIntoTextarea);
  elements.importPokemonList.addEventListener('click', () => importPokemonListFromText(elements.pasteImport.value));

  elements.ownedSearch.addEventListener('input', renderOwnedDex);
  elements.ownedDexList.addEventListener('click', (event) => {
    const addButton = event.target.closest('button.add-to-team');
    if (addButton) {
      const added = addPokemonToTeam(addButton.dataset.id);
      elements.importFeedback.textContent = added ? 'Added Pokémon to your active squad.' : 'That Pokémon is already in your squad.';
      if (added) {
        setMobileSection('squad', { scroll: true });
      }
      return;
    }

    const removeOwnedButton = event.target.closest('button.remove-owned');
    if (removeOwnedButton) {
      removeOwnedPokemonById(removeOwnedButton.dataset.id);
      elements.importFeedback.textContent = 'Removed Pokémon from your owned list.';
    }
  });

  elements.clearTeam.addEventListener('click', clearTeam);
  elements.saveHouse.addEventListener('click', saveCurrentTeamAsHouse);
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

  elements.autoGenerateHouse.addEventListener('click', generateAutoHouse);
  elements.clearHouses.addEventListener('click', clearHouses);
  elements.houseList.addEventListener('click', (event) => {
    const releaseButton = event.target.closest('button.release-house');
    if (!releaseButton) {
      return;
    }
    releaseHouseById(releaseButton.dataset.id);
  });

  elements.ownedOnlyToggle.addEventListener('change', runRecommendation);
  elements.requiredHabitat.addEventListener('change', runRecommendation);
  elements.resultCount.addEventListener('change', runRecommendation);
  elements.importanceRatio.addEventListener('input', () => {
    updateImportanceRatioLabel();
    refreshAllViews();
  });
  elements.toggleSpecialties.addEventListener('click', () => {
    state.specialtiesExpanded = !state.specialtiesExpanded;
    syncSpecialtiesCollapse();
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
    elements.status.textContent = 'Loading Pokémon data…';
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
    populateRequirementSelects();
    restoreRequirements();
    restoreOwnedIds();
    restoreHouseCounter();
    restoreHouses();
    restoreTeamIds();
    updateImportanceRatioLabel();
    bindEvents();
    syncCatalogCollapse();
    syncSpecialtiesCollapse();
    syncMobileSectionVisibility();
    refreshAllViews();

    elements.status.textContent = `${state.pokemon.length} Pokémon loaded.`;
    setOverlapPanelVisibility(false);
  } catch (error) {
    console.error(error);
    elements.status.textContent = 'Failed to load data. Start a local server and refresh.';
  }
}

init();
