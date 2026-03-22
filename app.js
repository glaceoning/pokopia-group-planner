import {
  canonicalizeMapName,
  clampRatio,
  matchesRequirements,
  normalizeImportToken,
  normalizeMapSet,
  normalizeText,
  parseImportTextFromLookup,
  sanitizeFreeText,
  setFrom,
  unique,
} from './planner-core.mjs';

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
  autoRequirements: 'pokopia.autoRequirements',
  houses: 'pokopia.houses',
  houseCounter: 'pokopia.houseCounter',
};

const HOUSE_MAPS = ['Withered Wastelands', 'Bleak Beach', 'Rocky Ridges', 'Sparkling Skylands', 'Palette Town', 'Cloud Island'];
const HOUSE_SIZE_MIN = 1;
const HOUSE_SIZE_MAX = 4;

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
  autoFiltersExpanded: false,
  editingHouseId: null,
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
  houseMapInput: document.querySelector('#houseMapInput'),
  saveHouse: document.querySelector('#saveHouse'),
  houseSaveFeedback: document.querySelector('#houseSaveFeedback'),
  clearHouses: document.querySelector('#clearHouses'),
  autoHouseName: document.querySelector('#autoHouseName'),
  autoHouseMap: document.querySelector('#autoHouseMap'),
  autoHouseMin: document.querySelector('#autoHouseMin'),
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
  recommendationMap: document.querySelector('#recommendationMap'),
  requiredHabitat: document.querySelector('#requiredHabitat'),
  requiredSpecialtiesBox: document.querySelector('#requiredSpecialtiesBox'),
  clearSpecialties: document.querySelector('#clearSpecialties'),
  specialtiesCard: document.querySelector('#specialtiesCard'),
  specialtiesContent: document.querySelector('#specialtiesContent'),
  toggleSpecialties: document.querySelector('#toggleSpecialties'),
  specialtiesHint: document.querySelector('#specialtiesHint'),
  autoFiltersCard: document.querySelector('#autoFiltersCard'),
  autoFiltersContent: document.querySelector('#autoFiltersContent'),
  toggleAutoFilters: document.querySelector('#toggleAutoFilters'),
  autoRequiredHabitat: document.querySelector('#autoRequiredHabitat'),
  autoRequiredSpecialtiesBox: document.querySelector('#autoRequiredSpecialtiesBox'),
  clearAutoSpecialties: document.querySelector('#clearAutoSpecialties'),
  autoSpecialtiesHint: document.querySelector('#autoSpecialtiesHint'),
  autoImportanceRatio: document.querySelector('#autoImportanceRatio'),
  autoImportanceValue: document.querySelector('#autoImportanceValue'),
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
    const hiddenOnMobile = mobileEnabled && state.mobileSection !== key;
    section.classList.toggle('mobile-hidden-section', hiddenOnMobile);
    section.setAttribute('aria-hidden', hiddenOnMobile ? 'true' : 'false');
  }

  elements.mobileSectionButtons.forEach((button) => {
    const active = button.dataset.mobileTarget === state.mobileSection;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
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

function listToText(values) {
  return values.length ? values.join(', ') : '—';
}

function createNode(tag, { className = '', text = '', attrs = {} } = {}) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text) {
    node.textContent = text;
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      node.setAttribute(key, String(value));
    }
  });
  return node;
}

function createBadge(className, text) {
  return createNode('span', { className, text });
}

function buildMapHint(pokemon, targetMap) {
  if (!targetMap) {
    return pokemon.locations.length ? `Maps: ${listToText(pokemon.locations.slice(0, 3))}${pokemon.locations.length > 3 ? ', …' : ''}` : 'Maps unknown';
  }

  return pokemon.locationNormSet.has(normalizeText(targetMap))
    ? `${pokemon.name} is available on ${targetMap}.`
    : `${pokemon.name} is not available on ${targetMap}.`;
}

function mapPokemon(raw) {
  const specialties = unique(Array.isArray(raw.specialties) ? raw.specialties : []);
  const favorites = unique(Array.isArray(raw.favorites) ? raw.favorites : []);
  const locations = normalizeMapSet(Array.isArray(raw.locations) ? raw.locations : []);
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
    locationNormSet: setFrom(locations),
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
      `${pokemon.dexPadded} ${pokemon.name}`,
      `${pokemon.dexRaw} ${pokemon.name}`,
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
  return clampRatio(elements.importanceRatio.value);
}

function updateImportanceRatioLabel() {
  elements.importanceValue.textContent = getImportanceRatio().toFixed(2);
}

function getAutoImportanceRatio() {
  return clampRatio(elements.autoImportanceRatio.value);
}

function updateAutoImportanceRatioLabel() {
  elements.autoImportanceValue.textContent = getAutoImportanceRatio().toFixed(2);
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

function syncAutoFiltersCollapse() {
  toggleCollapsible(elements.autoFiltersCard, elements.autoFiltersContent, elements.toggleAutoFilters, state.autoFiltersExpanded);
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
    const item = createNode('li', { className: 'overlap-item' });
    const top = createNode('div', { className: 'overlap-top' });
    top.append(createNode('strong', { text: row.label }), createNode('span', { className: 'overlap-count', text: `x${row.count}` }));
    item.append(top, createNode('div', { className: 'overlap-members', text: row.members.join(', ') }));
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
    recommendationMap: elements.recommendationMap.value,
    requiredHabitat: elements.requiredHabitat.value,
    selectedSpecialties: checkedSpecialties,
    resultCount: elements.resultCount.value,
    importanceRatio: elements.importanceRatio.value,
    ownedOnly: elements.ownedOnlyToggle.checked,
  });
}

function saveAutoRequirements() {
  const checkedSpecialties = [...elements.autoRequiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );

  writeStorage(STORAGE_KEYS.autoRequirements, {
    requiredHabitat: elements.autoRequiredHabitat.value,
    selectedSpecialties: checkedSpecialties,
    importanceRatio: elements.autoImportanceRatio.value,
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
  if (typeof saved.recommendationMap === 'string') {
    elements.recommendationMap.value = canonicalizeMapName(saved.recommendationMap);
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
  updateSpecialtiesHint();
}

function restoreAutoRequirements() {
  const saved = readStorage(STORAGE_KEYS.autoRequirements, null);
  if (!saved) {
    return;
  }

  if (typeof saved.requiredHabitat === 'string') {
    elements.autoRequiredHabitat.value = saved.requiredHabitat;
  }
  if (typeof saved.importanceRatio === 'string') {
    elements.autoImportanceRatio.value = saved.importanceRatio;
  }

  const specialties = Array.isArray(saved.selectedSpecialties) ? new Set(saved.selectedSpecialties) : new Set();
  elements.autoRequiredSpecialtiesBox.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = specialties.has(input.value);
  });
  updateAutoSpecialtiesHint();
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
    name: sanitizeFreeText(raw.name || '', 64) || formatHouseNumber(state.houses.length + 1),
    memberIds,
    map: HOUSE_MAPS.includes(canonicalizeMapName(raw.map)) ? canonicalizeMapName(raw.map) : HOUSE_MAPS[0],
    stackedScore: Number.isFinite(raw.stackedScore) ? raw.stackedScore : 0,
    simpleScore: Number.isFinite(raw.simpleScore) ? raw.simpleScore : 0,
    rating: String(raw.rating || '').trim() || 'D',
    createdAt: String(raw.createdAt || new Date().toISOString()),
    source: raw.source === 'auto' || raw.source === 'edited' ? raw.source : 'manual',
    sizeRange: raw.sizeRange && typeof raw.sizeRange === 'object' ? raw.sizeRange : null,
    importanceRatio: clampRatio(raw.importanceRatio),
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
  elements.autoRequiredHabitat.innerHTML = "<option value=''>Any habitat</option>";
  elements.recommendationMap.innerHTML = "<option value=''>Any map</option>";
  for (const habitat of habitats) {
    const option = document.createElement('option');
    option.value = habitat;
    option.textContent = habitat;
    elements.requiredHabitat.appendChild(option);
    elements.autoRequiredHabitat.appendChild(option.cloneNode(true));
  }

  HOUSE_MAPS.forEach((map) => {
    const option = document.createElement('option');
    option.value = map;
    option.textContent = map;
    elements.recommendationMap.appendChild(option);
  });

  const specialties = unique(state.sortedPokemon.flatMap((pokemon) => pokemon.specialties)).sort((a, b) => a.localeCompare(b));
  elements.requiredSpecialtiesBox.innerHTML = '';
  elements.autoRequiredSpecialtiesBox.innerHTML = '';

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

    const autoLabel = label.cloneNode(true);
    const autoInput = autoLabel.querySelector('input');
    autoInput.id = `auto_${id}`;
    autoLabel.htmlFor = `auto_${id}`;
    elements.autoRequiredSpecialtiesBox.appendChild(autoLabel);
  });

  updateSpecialtiesHint();
  updateAutoSpecialtiesHint();
}

function getSelectedSpecialtiesNormalized() {
  return [...elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => normalizeText(input.value))
    .filter(Boolean);
}

function getCurrentRequirements() {
  return {
    targetMapNorm: normalizeText(elements.recommendationMap.value),
    requiredHabitatNorm: normalizeText(elements.requiredHabitat.value),
    requiredSpecialtiesNorm: getSelectedSpecialtiesNormalized(),
  };
}

function getSelectedAutoSpecialtiesNormalized() {
  return [...elements.autoRequiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => normalizeText(input.value))
    .filter(Boolean);
}

function getCurrentAutoRequirements() {
  return {
    requiredHabitatNorm: normalizeText(elements.autoRequiredHabitat.value),
    requiredSpecialtiesNorm: getSelectedAutoSpecialtiesNormalized(),
  };
}

function updateSpecialtiesHint() {
  const selected = [...elements.requiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );
  elements.specialtiesHint.textContent = selected.length ? `Filtering to: ${selected.join(', ')}` : 'Showing all specialties';
}

function updateAutoSpecialtiesHint() {
  const selected = [...elements.autoRequiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked")].map(
    (input) => input.value,
  );
  elements.autoSpecialtiesHint.textContent = selected.length ? `Filtering to: ${selected.join(', ')}` : 'Showing all specialties';
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

    const info = createNode('div', { className: 'catalog-item-body' });
    const titleRow = createNode('div', { className: 'catalog-title-row' });
    titleRow.append(createNode('strong', { text: pokemon.label }), createBadge(`ownership-badge ${ownershipClass}`, ownershipLabel));
    info.append(
      titleRow,
      createNode('p', { text: `Habitat: ${pokemon.idealHabitat || 'Unknown'}` }),
      createNode('p', { text: `Specialties: ${listToText(pokemon.specialties)}` }),
      createNode('p', {
        text: `Favorites: ${listToText(pokemon.favorites.slice(0, 3))}${pokemon.favorites.length > 3 ? ', …' : ''}`,
      }),
      createNode('p', { className: 'hint tiny-text', text: buildMapHint(pokemon, elements.recommendationMap.value) }),
    );

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
  state.editingHouseId = null;
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
  state.editingHouseId = null;
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
    const card = createNode('article', { className: 'owned-card' });
    const head = createNode('div', { className: 'owned-card-head' });
    const textWrap = document.createElement('div');
    textWrap.append(
      createNode('p', { className: 'owned-card-name', text: pokemon.label }),
      createNode('p', { className: 'owned-card-meta', text: `Habitat: ${pokemon.idealHabitat || 'Unknown'} · Specialties: ${listToText(pokemon.specialties)}` }),
    );
    head.append(textWrap, createBadge('ownership-badge owned', 'Available'));

    const actions = createNode('div', { className: 'owned-card-actions' });
    actions.append(
      createNode('button', { className: 'add-to-team', text: 'Add to squad', attrs: { type: 'button', 'data-id': pokemon.id } }),
      createNode('button', {
        className: 'ghost remove-owned',
        text: 'Remove from Pokédex',
        attrs: { type: 'button', 'data-id': pokemon.id },
      }),
    );

    card.append(
      head,
      createNode('p', {
        className: 'owned-card-favorites',
        text: `Favorites: ${listToText(pokemon.favorites.slice(0, 4))}${pokemon.favorites.length > 4 ? ', …' : ''}`,
      }),
      createNode('p', { className: 'hint tiny-text', text: buildMapHint(pokemon, elements.recommendationMap.value) }),
      actions,
    );
    elements.ownedDexList.appendChild(card);
  }
}

function renderTeam() {
  const members = getTeamMembers();
  elements.teamList.innerHTML = '';
  elements.teamEmpty.classList.toggle('hidden', members.length > 0);
  elements.saveHouse.disabled = members.length === 0 || members.length > HOUSE_SIZE_MAX;

  if (!members.length) {
    elements.toggleOverlap.disabled = true;
    if (state.groupOverlapVisible) {
      setOverlapPanelVisibility(false);
    }
    return;
  }

  for (const member of members) {
    const li = createNode('li', { className: 'team-item' });
    const main = createNode('div', { className: 'team-item-main' });
    const top = createNode('div', { className: 'team-item-top' });
    top.append(createNode('strong', { text: member.label }), createBadge('chip', member.idealHabitat || 'Unknown habitat'));
    main.append(
      top,
      createNode('p', { text: `Specialties: ${listToText(member.specialties)}` }),
      createNode('p', { text: `Favorites: ${listToText(member.favorites)}` }),
      createNode('p', { className: 'hint tiny-text', text: buildMapHint(member, elements.houseMapInput.value || elements.recommendationMap.value) }),
    );
    li.append(
      main,
      createNode('button', { className: 'ghost remove-team', text: 'Remove', attrs: { type: 'button', 'data-id': member.id } }),
    );
    elements.teamList.appendChild(li);
  }

  elements.toggleOverlap.disabled = false;
  if (members.length > HOUSE_SIZE_MAX) {
    elements.houseSaveFeedback.textContent = `Reduce the active squad to ${HOUSE_SIZE_MAX} Pokémon or fewer before saving a House.`;
  }
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
  elements.spotlightSummary.textContent = `${topRow.owned ? 'Owned' : 'Unowned'} · Habitat ${
    topRow.candidate.idealHabitat || 'Unknown'
  } · Favorites ${topRow.favoritesScore} · Shared ${sharedFavorites} · ${buildMapHint(topRow.candidate, elements.recommendationMap.value)}`;
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

  elements.resultsBody.innerHTML = '';
  elements.recommendationsSection.classList.toggle('recommendations-awaiting-team', teamMembers.length === 0);

  if (!teamMembers.length) {
    state.lastRecommendationRows = [];
    elements.resultsBody.innerHTML =
      '<tr><td colspan="11" class="table-empty">Add at least one Pokémon to the active squad to generate recommendations.</td></tr>';
    updateSpotlight(null);
    renderTeamInsights(teamMembers);
    updateDashboard(null, 0);
    elements.status.textContent = 'Recommendations are waiting for an active squad.';
    saveRequirements();
    return;
  }

  for (const candidate of state.sortedPokemon) {
    if (!eligibleSet.has(candidate.id) || teamSet.has(candidate.id)) {
      continue;
    }
    if (ownedOnly && !ownedSet.has(candidate.id)) {
      continue;
    }
    if (!matchesRequirements(candidate, requirements)) {
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

  if (!topRows.length) {
    elements.resultsBody.innerHTML = '<tr><td colspan="11" class="table-empty">No recommendations match the current filters.</td></tr>';
  }

  for (const [index, row] of topRows.entries()) {
    const actionLabel = row.owned ? 'Add to squad' : 'Add to Pokédex';
    const tr = document.createElement('tr');
    const cells = [
      createNode('td', { text: String(index + 1), attrs: { 'data-label': 'Rank' } }),
      createNode('td', { text: row.candidate.label, attrs: { 'data-label': 'Pokémon' } }),
      createNode('td', { attrs: { 'data-label': 'Ownership' } }),
      createNode('td', { text: row.candidate.idealHabitat || 'Unknown', attrs: { 'data-label': 'Habitat' } }),
      createNode('td', { attrs: { 'data-label': 'Combined' } }),
      createNode('td', { text: String(row.habitatScore), attrs: { 'data-label': 'Habitat score' } }),
      createNode('td', { text: String(row.favoritesScore), attrs: { 'data-label': 'Favorites score' } }),
      createNode('td', {
        text: row.sharedFavoriteNames.length ? row.sharedFavoriteNames.join(', ') : '—',
        attrs: { 'data-label': 'Shared favorites' },
      }),
      createNode('td', { text: listToText(row.candidate.specialties), attrs: { 'data-label': 'Specialties' } }),
      createNode('td', { text: buildMapHint(row.candidate, elements.recommendationMap.value), attrs: { 'data-label': 'Map availability' } }),
      createNode('td', { attrs: { 'data-label': 'Action' } }),
    ];

    cells[2].append(createBadge(`ownership-badge ${row.owned ? 'owned' : 'unowned'}`, row.owned ? 'Owned' : 'Unowned'));
    cells[4].append(createNode('strong', { text: row.combinedScore.toFixed(2) }));
    cells[10].append(
      createNode('button', {
        className: 'tiny recommendation-action',
        text: actionLabel,
        attrs: { type: 'button', 'data-id': row.candidate.id, 'data-owned': row.owned },
      }),
    );
    tr.append(...cells);
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

function getHouseSourceLabel(house) {
  if (house.source === 'auto') {
    return 'Auto-generated House';
  }
  if (house.source === 'edited') {
    return 'Edited from a saved House';
  }
  return 'Saved from active squad';
}

function buildDefaultHouseName() {
  return formatHouseNumber(state.houseCounter);
}

function createHouseRecord({ name, memberIds, source, sizeRange, map, importanceRatio = getImportanceRatio() }) {
  const members = memberIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
  const summary = computeGroupScoreSummary(members, importanceRatio);
  state.houseCounter += 1;
  return {
    id: `house-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sanitizeFreeText(name || '', 64) || buildDefaultHouseName(),
    memberIds: [...memberIds],
    map: canonicalizeMapName(map),
    stackedScore: summary.stackedCombined,
    simpleScore: summary.simpleCombined,
    rating: buildHouseRating(summary),
    createdAt: new Date().toISOString(),
    source,
    sizeRange: sizeRange || null,
    importanceRatio,
    sequence: state.houseCounter,
  };
}

function validateHouseSize(memberIds) {
  if (memberIds.length < HOUSE_SIZE_MIN) {
    return `A House must contain at least ${HOUSE_SIZE_MIN} Pokémon.`;
  }
  if (memberIds.length > HOUSE_SIZE_MAX) {
    return `A House can contain at most ${HOUSE_SIZE_MAX} Pokémon.`;
  }
  return '';
}

function saveCurrentTeamAsHouse() {
  const memberIds = [...state.teamIds];
  if (!memberIds.length) {
    elements.houseSaveFeedback.textContent = 'Add Pokémon to the active squad before saving a House.';
    return;
  }

  const sizeError = validateHouseSize(memberIds);
  if (sizeError) {
    elements.houseSaveFeedback.textContent = sizeError;
    return;
  }

  const selectedMap = canonicalizeMapName(elements.houseMapInput.value);
  if (!HOUSE_MAPS.includes(selectedMap)) {
    elements.houseSaveFeedback.textContent = 'Choose a House map before saving.';
    return;
  }

  const offMapMembers = memberIds
    .map((id) => state.pokemonById.get(id))
    .filter((pokemon) => pokemon && !pokemon.locationNormSet.has(normalizeText(selectedMap)));
  if (offMapMembers.length) {
    elements.houseSaveFeedback.textContent = `These squad members are not available on ${selectedMap}: ${offMapMembers
      .map((pokemon) => pokemon.name)
      .join(', ')}.`;
    return;
  }

  const house = createHouseRecord({
    name: elements.houseNameInput.value,
    memberIds,
    source: state.editingHouseId ? 'edited' : 'manual',
    map: selectedMap,
    importanceRatio: getImportanceRatio(),
  });

  state.houses.unshift(house);
  state.teamIds = [];
  state.editingHouseId = null;
  saveHouses();
  saveTeamIds();
  elements.houseNameInput.value = '';
  elements.houseMapInput.value = '';
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

function editHouseById(id) {
  const house = state.houses.find((entry) => entry.id === id);
  if (!house) {
    return;
  }

  if (state.teamIds.length && !window.confirm('Replace the current active squad with this House so you can edit it?')) {
    return;
  }

  state.houses = state.houses.filter((entry) => entry.id !== id);
  state.teamIds = [...house.memberIds];
  state.editingHouseId = house.id;
  elements.houseNameInput.value = house.name || '';
  elements.houseMapInput.value = house.map || HOUSE_MAPS[0];
  elements.importanceRatio.value = String(clampRatio(house.importanceRatio));
  updateImportanceRatioLabel();
  saveHouses();
  saveTeamIds();
  refreshAllViews();
  elements.houseSaveFeedback.textContent = `${getHouseDisplayName(house)} moved back into the active squad with its saved weighting restored. Adjust members, then save it again.`;
  setMobileSection('squad', { scroll: true });
}

function evaluateHouseCandidate(memberIds, importanceRatio = getImportanceRatio()) {
  const members = memberIds.map((id) => state.pokemonById.get(id)).filter(Boolean);
  const summary = computeGroupScoreSummary(members, importanceRatio);
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

function getFilteredAutoHousePool(requirements, targetMap = '') {
  const targetMapNorm = normalizeText(targetMap);
  return getAvailableOwnedPokemon()
    .filter((pokemon) => !state.teamIds.includes(pokemon.id))
    .filter((pokemon) => matchesRequirements(pokemon, requirements))
    .filter((pokemon) => !targetMapNorm || pokemon.locationNormSet.has(targetMapNorm));
}

function generateBestHouseFromRange(minSize, maxSize, requirements, importanceRatio, targetMap = '') {
  const availablePool = getFilteredAutoHousePool(requirements, targetMap);
  if (availablePool.length < minSize) {
    return null;
  }

  let bestCandidate = null;

  for (const seed of availablePool) {
    let group = [seed];
    const remainingIds = new Set(availablePool.filter((pokemon) => pokemon.id !== seed.id).map((pokemon) => pokemon.id));

    if (group.length >= minSize) {
      const evaluatedSeed = evaluateHouseCandidate(group.map((member) => member.id), importanceRatio);
      if (isBetterHouseCandidate(evaluatedSeed, bestCandidate)) {
        bestCandidate = evaluatedSeed;
      }
    }

    while (group.length < maxSize && remainingIds.size > 0) {
      let bestNextEvaluation = null;
      let bestNextId = null;

      for (const id of remainingIds) {
        const nextMembers = [...group, state.pokemonById.get(id)].filter(Boolean);
        const evaluated = evaluateHouseCandidate(nextMembers.map((member) => member.id), importanceRatio);
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
        const evaluatedGroup = evaluateHouseCandidate(group.map((member) => member.id), importanceRatio);
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
  let minSize = Number.parseInt(elements.autoHouseMin.value, 10);
  let maxSize = Number.parseInt(elements.autoHouseMax.value, 10);

  if (!Number.isFinite(minSize)) {
    minSize = HOUSE_SIZE_MIN;
  }
  if (!Number.isFinite(maxSize)) {
    maxSize = HOUSE_SIZE_MAX;
  }

  minSize = Math.max(HOUSE_SIZE_MIN, Math.min(HOUSE_SIZE_MAX, minSize));
  maxSize = Math.max(HOUSE_SIZE_MIN, Math.min(HOUSE_SIZE_MAX, maxSize));
  if (minSize > maxSize) {
    [minSize, maxSize] = [maxSize, minSize];
  }

  minSize = Math.min(minSize, availableCount || minSize);
  maxSize = Math.min(maxSize, availableCount || maxSize);
  if (minSize > maxSize) {
    minSize = maxSize;
  }

  elements.autoHouseMin.value = String(minSize);
  elements.autoHouseMax.value = String(maxSize);

  return { minSize, maxSize, availableCount };
}

function generateAutoHouse() {
  const { minSize, maxSize, availableCount } = normalizeAutoHouseRange();
  const selectedMap = canonicalizeMapName(elements.autoHouseMap.value);
  const requirements = getCurrentAutoRequirements();
  const importanceRatio = getAutoImportanceRatio();

  if (!HOUSE_MAPS.includes(selectedMap)) {
    elements.autoHouseFeedback.textContent = 'Choose a House map before auto-generating.';
    return;
  }

  const filteredPoolCount = getFilteredAutoHousePool(requirements, selectedMap).length;
  if (filteredPoolCount < minSize) {
    elements.autoHouseFeedback.textContent = `At least ${minSize} unassigned owned Pokémon must match the current auto-create filters.`;
    return;
  }

  if (availableCount < HOUSE_SIZE_MIN) {
    elements.autoHouseFeedback.textContent = 'At least 1 unassigned owned Pokémon is needed to generate a House.';
    return;
  }

  const best = generateBestHouseFromRange(minSize, maxSize, requirements, importanceRatio, selectedMap);
  if (!best) {
    elements.autoHouseFeedback.textContent = 'No valid House could be generated from the current available pool.';
    return;
  }

  const house = createHouseRecord({
    name: elements.autoHouseName.value,
    memberIds: best.memberIds,
    source: 'auto',
    sizeRange: { min: minSize, max: maxSize },
    map: selectedMap,
    importanceRatio,
  });

  state.houses.unshift(house);
  saveHouses();
  saveAutoRequirements();
  elements.autoHouseName.value = '';
  elements.autoHouseMap.value = '';
  elements.autoHouseFeedback.textContent = `${getHouseDisplayName(house)} generated with ${house.memberIds.length} Pokémon on ${house.map}. Rating ${house.rating}, stacked synergy ${house.stackedScore.toFixed(2)}.`;
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
    const article = createNode('article', { className: 'house-card' });
    const top = createNode('div', { className: 'house-card-top' });
    const titleWrap = document.createElement('div');
    titleWrap.append(
      createNode('p', { className: 'house-card-kicker', text: getHouseSourceLabel(house) }),
      createNode('h3', { text: getHouseDisplayName(house) }),
    );
    const badges = createNode('div', { className: 'house-badge-stack' });
    badges.append(createBadge('rating-badge', `Rating ${house.rating}`), createBadge('pill', `${members.length} Pokémon`));
    top.append(titleWrap, badges);

    const scoreGrid = createNode('div', { className: 'house-score-grid' });
    [
      ['Map', house.map],
      ['Stacked synergy', house.stackedScore.toFixed(2)],
      ['Simple synergy', house.simpleScore.toFixed(2)],
      ['Weighting', house.importanceRatio.toFixed(2)],
    ].forEach(([label, value]) => {
      const chip = createNode('div', { className: 'score-chip' });
      chip.append(createNode('span', { text: label }), createNode('strong', { text: value }));
      scoreGrid.appendChild(chip);
    });

    const metaParts = [];
    if (house.sizeRange) {
      metaParts.push(`Generated with a size range of ${house.sizeRange.min}-${house.sizeRange.max}.`);
    }
    metaParts.push(`Created ${new Date(house.createdAt).toLocaleString()}.`);
    metaParts.push(`Weighting ${house.importanceRatio >= 0 ? 'leans favorites' : 'leans habitat'}.`);

    const memberList = createNode('ul', { className: 'house-member-list' });
    members.forEach((member) => {
      const item = document.createElement('li');
      item.append(
        createNode('strong', { text: member.label }),
        createNode('span', { text: `${member.idealHabitat || 'Unknown habitat'} · ${buildMapHint(member, house.map)}` }),
      );
      memberList.appendChild(item);
    });

    const actions = createNode('div', { className: 'inline-actions wrap-start' });
    actions.append(
      createNode('button', { className: 'ghost edit-house', text: 'Edit as active squad', attrs: { type: 'button', 'data-id': house.id } }),
      createNode('button', { className: 'ghost release-house', text: 'Release House', attrs: { type: 'button', 'data-id': house.id } }),
    );

    article.append(top, scoreGrid, createNode('p', { className: 'hint tiny-text', text: metaParts.join(' ') }), memberList, actions);
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
    elements.plannerInsight.textContent = 'Choose available Pokémon for the active squad before relying on recommendations.';
  } else {
    elements.plannerInsight.textContent = `${totalMatches} candidates match the current filters for the active squad.`;
  }

  if (!topRow || !teamCount) {
    elements.topRecommendationScore.textContent = '—';
    elements.topRecommendationName.textContent = !teamCount
      ? 'Build an active squad to unlock recommendations'
      : ownedCount
        ? 'No recommendation matches filters'
        : 'Add Pokémon to begin';
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
  return parseImportTextFromLookup(text, state.pokemonLookup);
}

function importPokemonListFromText(text) {
  const { lines, matchedIds, missing } = parseImportText(text);

  if (!lines.length) {
    elements.importFeedback.textContent = 'Paste at least one Pokémon name to import.';
    return;
  }

  const alreadyOwned = matchedIds.filter((id) => state.ownedIds.includes(id)).length;
  const added = addOwnedPokemonByIds(matchedIds);
  const parts = [`Read ${lines.length} lines.`, `Matched ${matchedIds.length} Pokémon.`, `Added ${added} new Pokémon.`];

  if (alreadyOwned) {
    parts.push(`${alreadyOwned} were already in your owned list.`);
  }

  if (missing.length) {
    const preview = missing.slice(0, 5).join(', ');
    parts.push(`Could not match: ${preview}${missing.length > 5 ? `, +${missing.length - 5} more` : ''}.`);
  }
  if (!matchedIds.length) {
    parts.push('Try names, dex numbers, bullet lists, or lines like "#025 Pikachu".');
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

function clearAutoSpecialtiesSelection() {
  elements.autoRequiredSpecialtiesBox.querySelectorAll("input[type='checkbox']:checked").forEach((input) => {
    input.checked = false;
  });
  updateAutoSpecialtiesHint();
  saveAutoRequirements();
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
    const editButton = event.target.closest('button.edit-house');
    if (editButton) {
      editHouseById(editButton.dataset.id);
      return;
    }

    const releaseButton = event.target.closest('button.release-house');
    if (!releaseButton) {
      return;
    }
    releaseHouseById(releaseButton.dataset.id);
  });

  elements.ownedOnlyToggle.addEventListener('change', runRecommendation);
  elements.recommendationMap.addEventListener('change', refreshAllViews);
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

  elements.toggleAutoFilters.addEventListener('click', () => {
    state.autoFiltersExpanded = !state.autoFiltersExpanded;
    syncAutoFiltersCollapse();
  });
  elements.clearAutoSpecialties.addEventListener('click', clearAutoSpecialtiesSelection);
  elements.autoRequiredHabitat.addEventListener('change', saveAutoRequirements);
  elements.autoRequiredSpecialtiesBox.addEventListener('change', () => {
    updateAutoSpecialtiesHint();
    saveAutoRequirements();
  });
  elements.autoImportanceRatio.addEventListener('input', () => {
    updateAutoImportanceRatioLabel();
    saveAutoRequirements();
  });
  [elements.autoHouseMin, elements.autoHouseMax].forEach((input) => {
    input.addEventListener('change', normalizeAutoHouseRange);
  });
  [elements.houseMapInput, elements.autoHouseMap].forEach((input) => {
    input.addEventListener('change', refreshAllViews);
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
    restoreAutoRequirements();
    restoreOwnedIds();
    restoreHouseCounter();
    restoreHouses();
    restoreTeamIds();
    updateImportanceRatioLabel();
    updateAutoImportanceRatioLabel();
    bindEvents();
    syncCatalogCollapse();
    syncSpecialtiesCollapse();
    syncAutoFiltersCollapse();
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
