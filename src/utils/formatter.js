/**
 * Report Formatter
 * Formats analysis results for console output
 */

import chalk from 'chalk';

/**
 * Format a score with color coding
 * @param {number} score - Score 0-100
 * @returns {string} Colored score
 */
export function formatScore(score) {
  if (score >= 80) return chalk.green.bold(score);
  if (score >= 60) return chalk.yellow.bold(score);
  if (score >= 40) return chalk.hex('#FFA500').bold(score); // Orange
  return chalk.red.bold(score);
}

/**
 * Format risk level with color
 * @param {string} risk - Risk level
 * @returns {string} Colored risk level
 */
export function formatRisk(risk) {
  const colors = {
    LOW: chalk.green.bold,
    MEDIUM: chalk.yellow.bold,
    ELEVATED: chalk.hex('#FFA500').bold,
    HIGH: chalk.red.bold,
    CRITICAL: chalk.bgRed.white.bold,
  };
  return (colors[risk] || chalk.white)(risk);
}

/**
 * Format package analysis result
 * @param {Object} result - Package analysis result
 * @returns {string} Formatted output
 */
export function formatPackageResult(result) {
  if (!result.found || !result.score) {
    return chalk.gray(`\n❌ ${result.packageName} - Not found or error`);
  }

  const { packageName, score, cveMetrics } = result;

  let output = `\n${'='.repeat(80)}\n`;
  output += chalk.cyan.bold(`📦 ${packageName}\n`);
  output += `${'='.repeat(80)}\n\n`;

  // Overall Score
  output += chalk.bold('Overall Score: ') + formatScore(score.totalScore) + '/100\n';
  output += chalk.bold('Risk Level: ') + formatRisk(score.riskLevel) + '\n';
  output += chalk.bold('Est. Annual Maintenance: ') + chalk.white(`~${score.estimatedAnnualMaintenanceHours} hours/year\n\n`);

  // Score Breakdown
  output += chalk.bold.underline('Score Breakdown:\n\n');

  const { breakdown } = score;

  // Historical CVEs
  output += chalk.yellow('📊 Historical Vulnerabilities (incl. transitive deps):\n');
  output += `   Score: ${formatScore(breakdown.historicalCVEs.score)}/100 (Weight: ${breakdown.historicalCVEs.weight * 100}%)\n`;
  output += `   Total CVEs: ${cveMetrics.totalCVEs}\n`;
  output += `   Avg CVEs/year: ${cveMetrics.avgCVEsPerYear}\n`;
  output += `   Critical/year: ${cveMetrics.criticalCVEsPerYear}\n`;
  output += `   High/year: ${cveMetrics.highCVEsPerYear}\n`;
  if (cveMetrics.oldestCVE) {
    output += `   Data range: ${cveMetrics.oldestCVE} to ${cveMetrics.newestCVE}\n`;
  }
  output += '\n';

  // Maintenance Health
  output += chalk.green('🔧 Maintenance Health:\n');
  output += `   Score: ${formatScore(breakdown.maintenanceHealth.score)}/100 (Weight: ${breakdown.maintenanceHealth.weight * 100}%)\n`;
  output += `   Last release: ${breakdown.maintenanceHealth.lastReleaseDate || 'Unknown'}\n`;
  output += `   Release frequency: ${breakdown.maintenanceHealth.releaseFrequency}\n`;
  output += `   Actively maintained: ${breakdown.maintenanceHealth.activelyMaintained ? '✅ Yes' : '❌ No'}\n\n`;

  // Dependency Complexity
  output += chalk.blue('🔗 Dependency Complexity:\n');
  output += `   Score: ${formatScore(breakdown.dependencyComplexity.score)}/100 (Weight: ${breakdown.dependencyComplexity.weight * 100}%)\n`;
  output += `   Direct dependencies: ${breakdown.dependencyComplexity.directDependencies}\n`;
  if (result.transitiveDependencies) {
    output += `   Total packages in tree: ${result.transitiveDependencies.totalPackagesInTree}\n`;
    output += `   Transitive dependencies: ${result.transitiveDependencies.indirectCount}\n`;
  }
  output += `   Complexity level: ${breakdown.dependencyComplexity.complexityLevel}\n\n`;

  // Technical Lag
  output += chalk.magenta('⏱️  Technical Lag:\n');
  output += `   Score: ${formatScore(breakdown.technicalLag.score)}/100 (Weight: ${breakdown.technicalLag.weight * 100}%)\n`;
  output += `   Days since last release: ${breakdown.technicalLag.daysSinceLastRelease || 'Unknown'}\n\n`;

  return output;
}

/**
 * Format project summary
 * @param {Object} summary - Project summary
 * @param {string} projectName - Project name
 * @returns {string} Formatted output
 */
export function formatProjectSummary(summary, projectName) {
  if (!summary) {
    return chalk.yellow('\n⚠️  No valid packages to analyze\n');
  }

  let output = `\n${'═'.repeat(80)}\n`;
  output += chalk.cyan.bold.underline(`📊 PROJECT SUMMARY: ${projectName}\n`);
  output += `${'═'.repeat(80)}\n\n`;

  // Overall Stats
  output += chalk.bold('Overall Score: ') + formatScore(summary.averageScore) + '/100\n';
  output += chalk.bold('Total Annual Maintenance Effort: ') + chalk.white(`~${summary.totalMaintenanceHours} hours\n`);
  output += chalk.bold('Total Known CVEs: ') + chalk.white(`${summary.totalCVEs}\n`);
  output += chalk.bold('Critical CVEs: ') + chalk.red(`${summary.totalCriticalCVEs}\n\n`);

  // Risk Distribution
  output += chalk.bold.underline('Risk Distribution:\n');
  output += `   ${formatRisk('LOW')}: ${summary.riskDistribution.LOW} packages\n`;
  output += `   ${formatRisk('MEDIUM')}: ${summary.riskDistribution.MEDIUM} packages\n`;
  output += `   ${formatRisk('ELEVATED')}: ${summary.riskDistribution.ELEVATED} packages\n`;
  output += `   ${formatRisk('HIGH')}: ${summary.riskDistribution.HIGH} packages\n`;
  output += `   ${formatRisk('CRITICAL')}: ${summary.riskDistribution.CRITICAL} packages\n\n`;

  // Highest Risk Packages
  if (summary.highestRiskPackages.length > 0) {
    output += chalk.bold.underline('⚠️  Highest Risk Packages:\n');
    for (const pkg of summary.highestRiskPackages) {
      output += `   ${pkg.name}: ${formatScore(pkg.score)} - ${formatRisk(pkg.risk)}\n`;
    }
    output += '\n';
  }

  output += `${'═'.repeat(80)}\n`;
  return output;
}

/**
 * Format a quick summary for a package
 * @param {Object} result - Package analysis result
 * @returns {string} One-line summary
 */
export function formatQuickSummary(result) {
  if (!result.found || !result.score) {
    return chalk.gray(`${result.packageName}: Not found`);
  }

  const score = result.score.totalScore;
  const risk = result.score.riskLevel;
  const cves = result.cveMetrics.totalCVEs;

  return `${result.packageName}: ${formatScore(score)} ${formatRisk(risk)} (${cves} CVEs)`;
}
