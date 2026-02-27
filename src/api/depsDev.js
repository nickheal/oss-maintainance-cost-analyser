/**
 * deps.dev API Client
 * Queries Google's deps.dev API for package metadata and dependency info
 * API Docs: https://docs.deps.dev/api/v3/
 */

const DEPS_DEV_API_URL = 'https://api.deps.dev/v3';

/**
 * Get package information from deps.dev
 * @param {string} packageName - npm package name
 * @returns {Promise<Object>} Package information
 */
export async function getPackageInfo(packageName) {
  try {
    const encodedName = encodeURIComponent(packageName);
    const response = await fetch(
      `${DEPS_DEV_API_URL}/systems/npm/packages/${encodedName}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Package not found
      }
      throw new Error(`deps.dev API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error querying deps.dev for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * Get specific version information
 * @param {string} packageName - npm package name
 * @param {string} version - Package version
 * @returns {Promise<Object>} Version information
 */
export async function getVersionInfo(packageName, version) {
  try {
    const encodedName = encodeURIComponent(packageName);
    const encodedVersion = encodeURIComponent(version);
    const response = await fetch(
      `${DEPS_DEV_API_URL}/systems/npm/packages/${encodedName}/versions/${encodedVersion}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`deps.dev API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error querying version info for ${packageName}@${version}:`, error.message);
    return null;
  }
}

/**
 * Calculate maintenance health metrics
 * @param {Object} packageInfo - Package info from deps.dev
 * @returns {Object} Maintenance metrics
 */
export function calculateMaintenanceMetrics(packageInfo) {
  if (!packageInfo || !packageInfo.versions) {
    return {
      score: 0,
      lastReleaseDate: null,
      daysSinceLastRelease: null,
      releaseFrequency: 'unknown',
      totalVersions: 0,
      activelyMaintained: false,
    };
  }

  const versions = packageInfo.versions || [];
  const sortedVersions = [...versions].sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0);
    const dateB = new Date(b.publishedAt || 0);
    return dateB - dateA;
  });

  const latestVersion = sortedVersions[0];
  const lastReleaseDate = latestVersion?.publishedAt
    ? new Date(latestVersion.publishedAt)
    : null;

  const daysSinceLastRelease = lastReleaseDate
    ? Math.floor((Date.now() - lastReleaseDate) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate release frequency (releases per year in last 2 years)
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  const recentReleases = versions.filter((v) => {
    const date = new Date(v.publishedAt || 0);
    return date > twoYearsAgo;
  });

  const releasesPerYear = recentReleases.length / 2;
  let releaseFrequency = 'unknown';
  if (releasesPerYear > 12) releaseFrequency = 'very active';
  else if (releasesPerYear > 6) releaseFrequency = 'active';
  else if (releasesPerYear > 2) releaseFrequency = 'moderate';
  else if (releasesPerYear > 0) releaseFrequency = 'low';
  else releaseFrequency = 'abandoned';

  // Calculate maintenance score (0-100)
  let score = 100;

  // Penalize based on days since last release
  if (daysSinceLastRelease > 730) score -= 60; // 2+ years
  else if (daysSinceLastRelease > 365) score -= 40; // 1+ year
  else if (daysSinceLastRelease > 180) score -= 20; // 6+ months
  else if (daysSinceLastRelease > 90) score -= 10; // 3+ months

  // Penalize based on release frequency
  if (releaseFrequency === 'abandoned') score -= 30;
  else if (releaseFrequency === 'low') score -= 15;

  score = Math.max(0, Math.min(100, score));

  const activelyMaintained = daysSinceLastRelease < 365 && releaseFrequency !== 'abandoned';

  return {
    score,
    lastReleaseDate: lastReleaseDate ? lastReleaseDate.toISOString().split('T')[0] : null,
    daysSinceLastRelease,
    releaseFrequency,
    releasesPerYear: parseFloat(releasesPerYear.toFixed(1)),
    totalVersions: versions.length,
    activelyMaintained,
  };
}

/**
 * Calculate dependency complexity metrics
 * @param {Object} versionInfo - Version info from deps.dev
 * @param {Object} [overrides] - Optional overrides for direct/total dependency counts
 * @param {number} [overrides.directDependencies] - Override direct dependency count
 * @param {number} [overrides.totalDependencies] - Override total dependency count (from dependency graph)
 * @returns {Object} Complexity metrics
 */
export function calculateComplexityMetrics(versionInfo, overrides = {}) {
  if (!versionInfo || !versionInfo.dependencies) {
    return {
      score: 100,
      directDependencies: overrides.directDependencies || 0,
      totalDependencies: overrides.totalDependencies || 0,
      complexityLevel: 'low',
    };
  }

  const directDeps = overrides.directDependencies ?? versionInfo.dependencies.length;
  const totalDeps = overrides.totalDependencies ?? (directDeps * 15);

  // Calculate complexity score based on total dependencies (0-100, where 100 is simple)
  let score = 100;

  // Primary scoring based on total transitive dependencies
  if (totalDeps > 500) score -= 50;
  else if (totalDeps > 200) score -= 35;
  else if (totalDeps > 100) score -= 20;
  else if (totalDeps > 50) score -= 10;

  // Additional penalty for high direct dependency counts
  if (directDeps > 50) score -= 20;
  else if (directDeps > 30) score -= 15;
  else if (directDeps > 15) score -= 10;
  else if (directDeps > 5) score -= 5;

  score = Math.max(0, Math.min(100, score));

  // Complexity level based on total dependencies
  let complexityLevel = 'low';
  if (totalDeps > 500) complexityLevel = 'very high';
  else if (totalDeps > 200) complexityLevel = 'high';
  else if (totalDeps > 50) complexityLevel = 'moderate';

  return {
    score,
    directDependencies: directDeps,
    totalDependencies: totalDeps,
    complexityLevel,
  };
}

/**
 * Get the full resolved dependency graph for a package version
 * Uses the deps.dev GetDependencies endpoint
 * @param {string} packageName - npm package name
 * @param {string} version - Exact package version
 * @returns {Promise<Object|null>} Dependency graph with nodes[] and edges[], or null on failure
 */
export async function getDependencyGraph(packageName, version) {
  try {
    const encodedName = encodeURIComponent(packageName);
    const encodedVersion = encodeURIComponent(version);
    const response = await fetch(
      `${DEPS_DEV_API_URL}/systems/npm/packages/${encodedName}/versions/${encodedVersion}:dependencies`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`deps.dev API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching dependency graph for ${packageName}@${version}:`, error.message);
    return null;
  }
}

/**
 * Extract unique package names from a dependency graph
 * @param {Object} dependencyGraph - Graph from getDependencyGraph
 * @returns {Array<{name: string, version: string, relation: string}>} Unique packages
 */
export function extractPackagesFromGraph(dependencyGraph) {
  if (!dependencyGraph || !dependencyGraph.nodes) {
    return [];
  }

  const seen = new Set();
  const packages = [];

  for (const node of dependencyGraph.nodes) {
    if (!node.versionKey) continue;

    const { name, version } = node.versionKey;
    const key = `${name}@${version}`;

    if (!seen.has(key)) {
      seen.add(key);
      packages.push({
        name,
        version,
        relation: node.relation || 'UNKNOWN',
      });
    }
  }

  return packages;
}

/**
 * Fetch and analyze package metadata
 * @param {string} packageName - npm package name
 * @param {string} version - Package version (optional)
 * @returns {Promise<Object>} Package metrics
 */
export async function getPackageMetrics(packageName, version = null) {
  const packageInfo = await getPackageInfo(packageName);

  if (!packageInfo) {
    return {
      found: false,
      maintenance: calculateMaintenanceMetrics(null),
      complexity: calculateComplexityMetrics(null),
    };
  }

  const maintenanceMetrics = calculateMaintenanceMetrics(packageInfo);

  // Get version-specific info if version provided
  let versionInfo = null;
  if (version) {
    versionInfo = await getVersionInfo(packageName, version);
  } else if (packageInfo.versions && packageInfo.versions.length > 0) {
    // Use latest version
    const sortedVersions = [...packageInfo.versions].sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0);
      const dateB = new Date(b.publishedAt || 0);
      return dateB - dateA;
    });
    versionInfo = await getVersionInfo(packageName, sortedVersions[0].versionKey.version);
  }

  const complexityMetrics = calculateComplexityMetrics(versionInfo);

  return {
    found: true,
    maintenance: maintenanceMetrics,
    complexity: complexityMetrics,
  };
}
