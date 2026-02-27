/**
 * OSS Maintainance Cost Score Calculator
 * Combines various metrics to calculate maintenance cost score
 */

// Configurable weights for composite score
const WEIGHTS = {
  historicalCVEs: 0.50,      // 50% - Historical vulnerability frequency
  maintenance: 0.10,         // 10% - Maintenance health
  complexity: 0.15,          // 15% - Dependency complexity
  technicalLag: 0.15,        // 15% - How outdated/vulnerable current version is
  communitySignals: 0.10,    // 10% - Community health (future enhancement)
};

/**
 * Calculate historical CVE score (0-100, where 100 is best/safest)
 * @param {Object} cveMetrics - CVE metrics from OSV
 * @returns {number} Score from 0-100
 */
export function calculateCVEScore(cveMetrics) {
  if (!cveMetrics || cveMetrics.totalCVEs === 0) {
    return 100; // No known CVEs = perfect score
  }

  let score = 100;

  // Heavily penalize based on average CVEs per year
  const avgPerYear = cveMetrics.avgCVEsPerYear || 0;
  if (avgPerYear > 10) score -= 70;
  else if (avgPerYear > 5) score -= 50;
  else if (avgPerYear > 2) score -= 30;
  else if (avgPerYear > 1) score -= 20;
  else if (avgPerYear > 0.5) score -= 10;

  // Additional penalty for critical/high severity CVEs
  const criticalPerYear = cveMetrics.criticalCVEsPerYear || 0;
  const highPerYear = cveMetrics.highCVEsPerYear || 0;

  if (criticalPerYear > 2) score -= 20;
  else if (criticalPerYear > 1) score -= 15;
  else if (criticalPerYear > 0.5) score -= 10;

  if (highPerYear > 3) score -= 15;
  else if (highPerYear > 1) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate technical lag score (0-100, where 100 is best/current)
 * @param {Object} cveMetrics - CVE metrics
 * @param {Object} maintenanceMetrics - Maintenance metrics
 * @returns {number} Score from 0-100
 */
export function calculateTechnicalLagScore(cveMetrics, maintenanceMetrics) {
  let score = 100;

  // Penalize if package hasn't been updated recently
  const daysSinceRelease = maintenanceMetrics.daysSinceLastRelease || 0;
  if (daysSinceRelease > 730) score -= 50; // 2+ years
  else if (daysSinceRelease > 365) score -= 30; // 1+ year
  else if (daysSinceRelease > 180) score -= 15; // 6+ months

  // Penalize if there are recent unpatched CVEs
  const recentCVEs = cveMetrics.bySeverity?.CRITICAL + cveMetrics.bySeverity?.HIGH || 0;
  if (recentCVEs > 5) score -= 40;
  else if (recentCVEs > 2) score -= 25;
  else if (recentCVEs > 0) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Estimate annual maintenance hours based on metrics
 * @param {Object} metrics - All package metrics
 * @returns {number} Estimated hours per year
 */
export function estimateMaintenanceHours(metrics) {
  let hours = 0;

  // Base maintenance
  hours += 2;

  // Add hours based on CVE frequency
  const avgCVEsPerYear = metrics.cve?.avgCVEsPerYear || 0;
  hours += avgCVEsPerYear * 2; // 2 hours per CVE to investigate and patch

  // Add hours for critical CVEs (more time to test)
  const criticalPerYear = metrics.cve?.criticalCVEsPerYear || 0;
  hours += criticalPerYear * 4;

  // Add hours based on dependency complexity
  const directDeps = metrics.metadata?.complexity?.directDependencies || 0;
  hours += directDeps * 0.2; // 0.2 hours per direct dependency per year

  // Add hours if package is poorly maintained (more debugging)
  if (metrics.metadata?.maintenance?.releaseFrequency === 'abandoned') {
    hours += 10;
  } else if (metrics.metadata?.maintenance?.releaseFrequency === 'low') {
    hours += 5;
  }

  return Math.round(hours);
}

/**
 * Determine risk level based on composite score
 * @param {number} score - Composite score (0-100)
 * @returns {string} Risk level
 */
export function getRiskLevel(score) {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Calculate composite OSS Maintainance Cost Score
 * @param {Object} cveMetrics - CVE metrics from OSV
 * @param {Object} packageMetrics - Package metrics from deps.dev
 * @returns {Object} Composite score and breakdown
 */
export function calculateCompositeScore(cveMetrics, packageMetrics) {
  const cveScore = calculateCVEScore(cveMetrics);
  const maintenanceScore = packageMetrics.maintenance?.score || 50;
  const complexityScore = packageMetrics.complexity?.score || 50;
  const technicalLagScore = calculateTechnicalLagScore(
    cveMetrics,
    packageMetrics.maintenance || {}
  );
  const communityScore = 50; // Placeholder for future implementation

  // Calculate weighted composite score
  const compositeScore = Math.round(
    cveScore * WEIGHTS.historicalCVEs +
    maintenanceScore * WEIGHTS.maintenance +
    complexityScore * WEIGHTS.complexity +
    technicalLagScore * WEIGHTS.technicalLag +
    communityScore * WEIGHTS.communitySignals
  );

  const allMetrics = {
    cve: cveMetrics,
    metadata: packageMetrics,
  };

  const estimatedHours = estimateMaintenanceHours(allMetrics);
  const riskLevel = getRiskLevel(compositeScore);

  return {
    totalScore: compositeScore,
    riskLevel,
    estimatedAnnualMaintenanceHours: estimatedHours,
    breakdown: {
      historicalCVEs: {
        score: cveScore,
        weight: WEIGHTS.historicalCVEs,
        weightedScore: Math.round(cveScore * WEIGHTS.historicalCVEs),
        avgCVEsPerYear: cveMetrics.avgCVEsPerYear,
        criticalCVEsPerYear: cveMetrics.criticalCVEsPerYear,
        highCVEsPerYear: cveMetrics.highCVEsPerYear,
        totalCVEs: cveMetrics.totalCVEs,
      },
      maintenanceHealth: {
        score: maintenanceScore,
        weight: WEIGHTS.maintenance,
        weightedScore: Math.round(maintenanceScore * WEIGHTS.maintenance),
        lastReleaseDate: packageMetrics.maintenance?.lastReleaseDate,
        releaseFrequency: packageMetrics.maintenance?.releaseFrequency,
        activelyMaintained: packageMetrics.maintenance?.activelyMaintained,
      },
      dependencyComplexity: {
        score: complexityScore,
        weight: WEIGHTS.complexity,
        weightedScore: Math.round(complexityScore * WEIGHTS.complexity),
        directDependencies: packageMetrics.complexity?.directDependencies,
        complexityLevel: packageMetrics.complexity?.complexityLevel,
      },
      technicalLag: {
        score: technicalLagScore,
        weight: WEIGHTS.technicalLag,
        weightedScore: Math.round(technicalLagScore * WEIGHTS.technicalLag),
        daysSinceLastRelease: packageMetrics.maintenance?.daysSinceLastRelease,
      },
      communitySignals: {
        score: communityScore,
        weight: WEIGHTS.communitySignals,
        weightedScore: Math.round(communityScore * WEIGHTS.communitySignals),
        note: 'Future enhancement',
      },
    },
  };
}
