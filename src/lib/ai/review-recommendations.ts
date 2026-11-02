const UNSUPPORTED_NUMBER_PATTERN =
  /(?:₹|INR|Rs\.?\s*)\s*\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:%|\b(?:percent|days?|months?|years?|rupees?|INR)\b)|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|ninety)\s+(?:percent|days?|months?|years?|rupees?)\b/i;
const UNSUPPORTED_INTEREST_BENCHMARK_PATTERN =
  /\b(?:RBI\s+)?base\s+rate\b|\b(?:RBI|repo)\s+rate\b/i;
const FORUM_LOCATION_PATTERN =
  /\b(?:courts?|jurisdiction|venue|forum|seat)\b[^.!?;]{0,60}?\b(?:located\s+in|based\s+in|in|at|of)\s+([A-Z][A-Za-z-]*(?:\s+[A-Z][A-Za-z-]*){0,2})/g;
const SAFE_FOLLOW_UP =
  'Confirm the appropriate value, interest terms, or legally permissible forum with the parties and qualified counsel; no specific term is inferred from the extracted document.';

export function hasUnsupportedRecommendationTerm(
  value: string,
  sourceText: string,
): boolean {
  const normalizedSource = normalize(sourceText);
  const numberMatches = value.match(
    new RegExp(UNSUPPORTED_NUMBER_PATTERN.source, 'gi'),
  );
  if (
    numberMatches?.some((match) => !normalizedSource.includes(normalize(match)))
  ) {
    return true;
  }

  if (
    UNSUPPORTED_INTEREST_BENCHMARK_PATTERN.test(value) &&
    !normalizedSource.match(UNSUPPORTED_INTEREST_BENCHMARK_PATTERN)
  ) {
    return true;
  }

  const locationMatches = value.matchAll(
    new RegExp(FORUM_LOCATION_PATTERN.source, 'g'),
  );
  for (const match of locationMatches) {
    const location = match[1];
    if (location && !normalizedSource.includes(normalize(location))) {
      return true;
    }
  }

  return false;
}

export function replaceUnsupportedRecommendation(
  value: string,
  sourceText: string,
): string {
  return hasUnsupportedRecommendationTerm(value, sourceText)
    ? SAFE_FOLLOW_UP
    : value;
}

export function removeUnsupportedProposedWording(
  value: string,
  sourceText: string,
): string {
  return hasUnsupportedRecommendationTerm(value, sourceText) ? '' : value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}
