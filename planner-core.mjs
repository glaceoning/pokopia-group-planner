export const MAP_NAME_ALIASES = new Map([
  ['withered wasteland', 'Withered Wastelands'],
  ['withered wastelands', 'Withered Wastelands'],
  ['bleak beach', 'Bleak Beach'],
  ['rocky ridges', 'Rocky Ridges'],
  ['sparkling skylands', 'Sparkling Skylands'],
  ['palette town', 'Palette Town'],
  ['pallette town', 'Palette Town'],
  ['cloud island', 'Cloud Island'],
]);

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeImportToken(value) {
  return normalizeText(value).replace(/^#/, '');
}

export function unique(values) {
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

export function setFrom(values) {
  return new Set(values.map(normalizeText).filter(Boolean));
}

export function clampRatio(value) {
  const raw = Number.parseFloat(value);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, raw));
}

export function sanitizeFreeText(value, maxLength = 80) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function canonicalizeMapName(value) {
  const normalized = normalizeText(value);
  return MAP_NAME_ALIASES.get(normalized) || '';
}

export function normalizeMapSet(values) {
  const out = [];
  const seen = new Set();

  for (const value of values || []) {
    const canonical = canonicalizeMapName(value);
    if (!canonical || seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    out.push(canonical);
  }

  return out;
}

export function matchesRequirements(candidate, requirements) {
  if (requirements.requiredHabitatNorm && candidate.idealHabitatNorm !== requirements.requiredHabitatNorm) {
    return false;
  }

  if (requirements.requiredSpecialtiesNorm.length > 0) {
    const matchesSpecialty = requirements.requiredSpecialtiesNorm.some((specialty) => candidate.specialtiesNorm.has(specialty));
    if (!matchesSpecialty) {
      return false;
    }
  }

  if (requirements.targetMapNorm) {
    return candidate.locationNormSet?.has(requirements.targetMapNorm);
  }

  return true;
}

export function buildImportCandidates(line) {
  const compact = String(line ?? '').trim();
  if (!compact) {
    return [];
  }

  const slashless = compact.replace(/\s*\/\/.*$/, '');
  const noParensComment = slashless.replace(/\s+\([^)]*\)\s*$/, '');
  const noTrailingComment = noParensComment.replace(/\s+-\s+owned.*$/i, '');
  const commaSplit = noTrailingComment
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates = [];

  for (const rawPart of commaSplit.length ? commaSplit : [noTrailingComment]) {
    const stripped = rawPart
      .replace(/^[\s>*•·\-–—]+/, '')
      .replace(/^\d+[\).\]:-]?\s+/, '')
      .replace(/^#/, '')
      .trim();

    if (!stripped) {
      continue;
    }

    const variations = [
      stripped,
      stripped.replace(/^0+(\d+)/, '$1'),
      stripped.replace(/^(\d+)\s+/, ''),
      stripped.replace(/^(\d+)\s*-\s*/, ''),
      stripped.replace(/^(\d+)\s+/, '').replace(/^#/, ''),
    ];

    const numberMatch = stripped.match(/^(\d{1,4})\b/);
    if (numberMatch) {
      const dex = String(Number.parseInt(numberMatch[1], 10));
      const dexPadded = dex.padStart(3, '0');
      variations.push(dex, dexPadded, `#${dex}`, `#${dexPadded}`);
    }

    for (const variation of variations) {
      const normalized = normalizeImportToken(variation);
      if (normalized) {
        candidates.push(normalized);
      }
    }
  }

  return unique(candidates);
}

export function parseImportTextFromLookup(text, lookup) {
  const rawLines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchedIds = [];
  const missing = [];

  for (const line of rawLines) {
    const candidates = buildImportCandidates(line);
    let matchedId = '';

    for (const token of candidates) {
      const id = lookup.get(token);
      if (id) {
        matchedId = id;
        break;
      }
    }

    if (matchedId) {
      matchedIds.push(matchedId);
    } else {
      missing.push(line);
    }
  }

  return {
    lines: rawLines,
    matchedIds: unique(matchedIds),
    missing,
  };
}
