/**
 * Version resolution utilities
 * Resolves semver ranges to concrete versions using available version lists
 */
import semver from 'semver';

/**
 * Resolve a semver range to the best matching concrete version
 * @param {string} range - Semver range (e.g., "^4.18.2", "~1.2.0", ">=2.0.0")
 * @param {Array<string>} availableVersions - List of available version strings
 * @returns {string|null} Best matching version, or null if none match
 */
export function resolveVersion(range, availableVersions) {
  if (!range || !availableVersions || availableVersions.length === 0) {
    return null;
  }

  // If it's already an exact version, return it if available
  if (semver.valid(range)) {
    return availableVersions.includes(range) ? range : null;
  }

  // Filter to valid semver versions and find the max satisfying
  const validVersions = availableVersions.filter((v) => semver.valid(v));
  return semver.maxSatisfying(validVersions, range);
}
