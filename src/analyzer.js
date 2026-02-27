/**
 * Main Analyzer
 * Orchestrates the analysis of package.json dependencies
 */

import { promises as fs } from "node:fs";
import {
  getPackageVulnerabilityMetrics,
  queryVulnerabilitiesBatch,
  deduplicateVulnerabilities,
  calculateCVEMetrics,
} from "./api/osv.js";
import {
  getPackageMetrics,
  getPackageInfo,
  getDependencyGraph,
  extractPackagesFromGraph,
} from "./api/depsDev.js";
import { calculateCompositeScore } from "./scoring/calculator.js";
import { resolveVersion } from "./utils/version.js";

/**
 * Read and parse package.json
 * @param {string} filePath - Path to package.json
 * @returns {Promise<Object>} Parsed package.json
 */
export async function readPackageJson(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

/**
 * Extract dependencies from package.json
 * @param {Object} packageJson - Parsed package.json
 * @param {boolean} includeDev - Include devDependencies
 * @returns {Array} Array of {name, version} objects
 */
export function extractDependencies(packageJson, includeDev = false) {
  const dependencies = [];

  // Production dependencies
  if (packageJson.dependencies) {
    for (const [name, version] of Object.entries(packageJson.dependencies)) {
      dependencies.push({ name, version, type: "production" });
    }
  }

  // Dev dependencies
  if (includeDev && packageJson.devDependencies) {
    for (const [name, version] of Object.entries(packageJson.devDependencies)) {
      dependencies.push({ name, version, type: "development" });
    }
  }

  return dependencies;
}

/**
 * Get aggregate CVE metrics for a package and all its transitive dependencies
 * @param {string} packageName - npm package name
 * @param {string} versionRange - Version range from package.json (e.g., "^4.18.2")
 * @param {Object} [options] - Options
 * @param {Map<string, Array>} [options.vulnCache] - Shared vulnerability cache
 * @param {number} [options.concurrency] - Max concurrent API requests
 * @param {boolean} [options.shallow] - If true, only analyze direct package (no transitive deps)
 * @returns {Promise<Object>} Object with { cveMetrics, transitivePackageCount, packageNames }
 */
export async function getTransitiveCVEMetrics(
  packageName,
  versionRange,
  options = {}
) {
  const { vulnCache = new Map(), concurrency = 5, shallow = false } = options;

  // If shallow mode, just query the direct package
  if (shallow) {
    const directVulns = await getPackageVulnerabilityMetrics(packageName);
    return {
      cveMetrics: directVulns,
      transitivePackageCount: 0,
      directPackageCount: 0,
      totalPackagesInTree: 1,
      packageNames: [packageName],
    };
  }

  // Step 1: Resolve version range to a concrete version
  let resolvedVersion = null;
  let packageInfo = null;

  try {
    packageInfo = await getPackageInfo(packageName);
    if (packageInfo && packageInfo.versions) {
      const availableVersions = packageInfo.versions
        .map((v) => v.versionKey?.version)
        .filter(Boolean);

      // If no version range specified, use the latest version
      if (!versionRange) {
        const sortedVersions = [...packageInfo.versions].sort((a, b) => {
          const dateA = new Date(a.publishedAt || 0);
          const dateB = new Date(b.publishedAt || 0);
          return dateB - dateA;
        });
        resolvedVersion = sortedVersions[0]?.versionKey?.version;
      } else {
        resolvedVersion = resolveVersion(versionRange, availableVersions);
      }
    }
  } catch (error) {
    console.error(
      `Version resolution failed for ${packageName}: ${error.message}`
    );
  }

  // Step 2: Fetch full dependency graph
  let treePackages = [
    { name: packageName, version: resolvedVersion, relation: "SELF" },
  ];

  if (resolvedVersion) {
    let graph = await getDependencyGraph(packageName, resolvedVersion);

    // If the exact version doesn't have dependency data, try falling back to recent versions
    if (!graph && packageInfo && packageInfo.versions) {
      console.warn(
        `Dependency graph not available for ${packageName}@${resolvedVersion}, trying recent versions...`
      );

      // Get versions sorted by publish date (newest first)
      const sortedVersions = [...packageInfo.versions].sort((a, b) => {
        const dateA = new Date(a.publishedAt || 0);
        const dateB = new Date(b.publishedAt || 0);
        return dateB - dateA;
      });

      // Try up to 10 recent versions
      for (let i = 0; i < Math.min(10, sortedVersions.length); i++) {
        const fallbackVersion = sortedVersions[i].versionKey?.version;
        if (fallbackVersion && fallbackVersion !== resolvedVersion) {
          graph = await getDependencyGraph(packageName, fallbackVersion);
          if (graph) {
            console.warn(
              `Using dependency graph from ${packageName}@${fallbackVersion} as fallback`
            );
            resolvedVersion = fallbackVersion;
            break;
          }
        }
      }
    }

    if (graph) {
      treePackages = extractPackagesFromGraph(graph);
    } else {
      console.warn(
        `Could not fetch dependency graph for ${packageName}@${resolvedVersion}, analyzing direct package only`
      );
    }
  } else {
    console.warn(
      `Could not resolve version for ${packageName} (${versionRange}), analyzing direct package only`
    );
  }

  // Step 3: Query vulnerabilities for all unique packages in the tree
  const uniqueNames = [...new Set(treePackages.map((p) => p.name))];
  const vulnsByPackage = await queryVulnerabilitiesBatch(uniqueNames, {
    cache: vulnCache,
    concurrency,
  });

  // Step 4: Deduplicate and calculate aggregate metrics
  const deduplicatedVulns = deduplicateVulnerabilities(vulnsByPackage);
  const cveMetrics = calculateCVEMetrics(deduplicatedVulns);

  return {
    cveMetrics,
    transitivePackageCount: treePackages.filter((p) => p.relation === "INDIRECT")
      .length,
    directPackageCount: treePackages.filter((p) => p.relation === "DIRECT")
      .length,
    totalPackagesInTree: uniqueNames.length,
    packageNames: uniqueNames,
  };
}

/**
 * Analyze a single package
 * @param {string} packageName - Package name
 * @param {string} version - Package version
 * @param {Object} [options] - Options
 * @param {Map<string, Array>} [options.vulnCache] - Shared vulnerability cache
 * @param {number} [options.concurrency] - Max concurrent API requests
 * @param {boolean} [options.shallow] - If true, only analyze direct package
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzePackage(packageName, version, options = {}) {
  const { vulnCache = new Map(), concurrency = 5, shallow = false } = options;

  console.log(`\n📦 Analyzing ${packageName}...`);

  try {
    // Fetch aggregate CVE data from the full dependency tree
    const transitiveResult = await getTransitiveCVEMetrics(
      packageName,
      version,
      {
        vulnCache,
        concurrency,
        shallow,
      }
    );
    const cveMetrics = transitiveResult.cveMetrics;

    // Fetch package metadata from deps.dev
    const packageMetrics = await getPackageMetrics(packageName, version);

    // Update complexity metrics with real transitive dep count
    if (packageMetrics.complexity && transitiveResult.totalPackagesInTree > 0) {
      packageMetrics.complexity.totalDependencies =
        transitiveResult.totalPackagesInTree;
      packageMetrics.complexity.directDependencies =
        transitiveResult.directPackageCount;
    }

    // Calculate composite score
    const score = calculateCompositeScore(cveMetrics, packageMetrics);

    return {
      packageName,
      version,
      found: packageMetrics.found,
      score,
      cveMetrics,
      packageMetrics,
      transitiveDependencies: {
        totalPackagesInTree: transitiveResult.totalPackagesInTree,
        directCount: transitiveResult.directPackageCount,
        indirectCount: transitiveResult.transitivePackageCount,
      },
    };
  } catch (error) {
    console.error(`Error analyzing ${packageName}:`, error.message);
    return {
      packageName,
      version,
      found: false,
      error: error.message,
    };
  }
}

/**
 * Analyze all dependencies in package.json
 * @param {string} packageJsonPath - Path to package.json
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Complete analysis results
 */
export async function analyzeProject(packageJsonPath, options = {}) {
  const { includeDev = false, maxConcurrent = 5 } = options;

  console.log(`\n🔍 Reading ${packageJsonPath}...`);

  // Read package.json
  const packageJson = await readPackageJson(packageJsonPath);
  const projectName = packageJson.name || "Unknown Project";

  console.log(`\n📊 Analyzing project: ${projectName}`);

  // Extract dependencies
  const dependencies = extractDependencies(packageJson, includeDev);
  console.log(`\n📦 Found ${dependencies.length} dependencies to analyze`);

  if (dependencies.length === 0) {
    return {
      projectName,
      totalDependencies: 0,
      packages: [],
      summary: null,
    };
  }

  // Shared cache for vulnerability data across all dependency trees
  const vulnCache = new Map();

  // Analyze packages (with concurrency limit to avoid rate limiting)
  const packages = [];
  for (let i = 0; i < dependencies.length; i += maxConcurrent) {
    const batch = dependencies.slice(i, i + maxConcurrent);
    const results = await Promise.all(
      batch.map((dep) =>
        analyzePackage(dep.name, dep.version, {
          vulnCache,
          concurrency: maxConcurrent,
        })
      )
    );
    packages.push(...results);

    // Progress indicator
    console.log(
      `Progress: ${Math.min(i + maxConcurrent, dependencies.length)}/${dependencies.length}`,
    );
  }

  // Calculate summary statistics
  const summary = calculateProjectSummary(packages);

  return {
    projectName,
    totalDependencies: dependencies.length,
    packages,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Calculate summary statistics for the project
 * @param {Array} packages - Array of analyzed packages
 * @returns {Object} Summary statistics
 */
export function calculateProjectSummary(packages) {
  const validPackages = packages.filter((p) => p.score);

  if (validPackages.length === 0) {
    return null;
  }

  const scores = validPackages.map((p) => p.score.totalScore);
  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length,
  );

  const riskCounts = {
    LOW: 0,
    MEDIUM: 0,
    ELEVATED: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  let totalMaintenanceHours = 0;
  let totalCVEs = 0;
  let totalCriticalCVEs = 0;

  for (const pkg of validPackages) {
    riskCounts[pkg.score.riskLevel]++;
    totalMaintenanceHours += pkg.score.estimatedAnnualMaintenanceHours || 0;
    totalCVEs += pkg.cveMetrics?.totalCVEs || 0;
    totalCriticalCVEs += pkg.cveMetrics?.bySeverity?.CRITICAL || 0;
  }

  const highestRisk = validPackages
    .sort((a, b) => a.score.totalScore - b.score.totalScore)
    .slice(0, 5)
    .map((p) => ({
      name: p.packageName,
      score: p.score.totalScore,
      risk: p.score.riskLevel,
    }));

  return {
    averageScore,
    totalMaintenanceHours,
    totalCVEs,
    totalCriticalCVEs,
    riskDistribution: riskCounts,
    highestRiskPackages: highestRisk,
    analysisDate: new Date().toISOString().split("T")[0],
  };
}

/**
 * Save analysis results to a file
 * @param {Object} results - Analysis results
 * @param {string} outputPath - Output file path
 */
export async function saveResults(results, outputPath) {
  try {
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\n✅ Results saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error saving results: ${error.message}`);
  }
}
