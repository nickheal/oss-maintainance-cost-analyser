/**
 * OSV.dev API Client
 * Queries the Open Source Vulnerabilities database for CVE data
 * API Docs: https://osv.dev/docs/
 */

const OSV_API_URL = 'https://api.osv.dev/v1';

/**
 * Query OSV.dev for vulnerabilities affecting a specific package
 * @param {string} packageName - npm package name
 * @returns {Promise<Object>} Vulnerability data
 */
export async function queryVulnerabilities(packageName) {
  try {
    const response = await fetch(`${OSV_API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package: {
          name: packageName,
          ecosystem: 'npm',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OSV API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error querying OSV for ${packageName}:`, error.message);
    return { vulns: [] };
  }
}

/**
 * Calculate CVE frequency metrics from vulnerability data
 * @param {Array} vulnerabilities - Array of vulnerability objects from OSV
 * @returns {Object} Metrics including CVE counts by severity and year
 */
export function calculateCVEMetrics(vulnerabilities) {
  if (!vulnerabilities || vulnerabilities.length === 0) {
    return {
      totalCVEs: 0,
      avgCVEsPerYear: 0,
      criticalCVEsPerYear: 0,
      highCVEsPerYear: 0,
      moderateCVEsPerYear: 0,
      lowCVEsPerYear: 0,
      bySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MODERATE: 0,
        LOW: 0,
        UNKNOWN: 0,
      },
      byYear: {},
      oldestCVE: null,
      newestCVE: null,
    };
  }

  const bySeverity = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
    UNKNOWN: 0,
  };

  const byYear = {};
  let oldestDate = null;
  let newestDate = null;

  for (const vuln of vulnerabilities) {
    // Extract publication date
    const publishedDate = vuln.published ? new Date(vuln.published) : null;

    if (publishedDate) {
      const year = publishedDate.getFullYear();
      byYear[year] = (byYear[year] || 0) + 1;

      if (!oldestDate || publishedDate < oldestDate) {
        oldestDate = publishedDate;
      }
      if (!newestDate || publishedDate > newestDate) {
        newestDate = publishedDate;
      }
    }

    // Determine severity
    let severity = 'UNKNOWN';
    if (vuln.database_specific?.severity) {
      severity = vuln.database_specific.severity.toUpperCase();
    } else if (vuln.severity) {
      // OSV v1.0 schema
      for (const sev of vuln.severity) {
        if (sev.type === 'CVSS_V3') {
          const score = parseFloat(sev.score);
          if (score >= 9.0) severity = 'CRITICAL';
          else if (score >= 7.0) severity = 'HIGH';
          else if (score >= 4.0) severity = 'MODERATE';
          else severity = 'LOW';
          break;
        }
      }
    }

    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
  }

  // Calculate time span
  const yearsOfData = oldestDate && newestDate
    ? (newestDate - oldestDate) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;

  const effectiveYears = Math.max(yearsOfData, 1); // At least 1 year to avoid division by zero

  const totalCVEs = vulnerabilities.length;
  const avgCVEsPerYear = totalCVEs / effectiveYears;

  return {
    totalCVEs,
    avgCVEsPerYear: parseFloat(avgCVEsPerYear.toFixed(2)),
    criticalCVEsPerYear: parseFloat((bySeverity.CRITICAL / effectiveYears).toFixed(2)),
    highCVEsPerYear: parseFloat((bySeverity.HIGH / effectiveYears).toFixed(2)),
    moderateCVEsPerYear: parseFloat((bySeverity.MODERATE / effectiveYears).toFixed(2)),
    lowCVEsPerYear: parseFloat((bySeverity.LOW / effectiveYears).toFixed(2)),
    bySeverity,
    byYear,
    oldestCVE: oldestDate ? oldestDate.toISOString().split('T')[0] : null,
    newestCVE: newestDate ? newestDate.toISOString().split('T')[0] : null,
    yearsOfData: parseFloat(yearsOfData.toFixed(1)),
  };
}

/**
 * Query vulnerabilities for multiple packages with caching
 * Uses individual POST /v1/query calls with an in-memory cache
 * @param {Array<string>} packageNames - Array of npm package names
 * @param {Object} [options] - Options
 * @param {Map<string, Array>} [options.cache] - Shared cache map (packageName -> vulns array)
 * @param {number} [options.concurrency] - Max concurrent requests (default: 5)
 * @returns {Promise<Map<string, Array>>} Map of packageName -> vulnerabilities array
 */
export async function queryVulnerabilitiesBatch(packageNames, options = {}) {
  const { cache = new Map(), concurrency = 5 } = options;
  const results = new Map();

  // Separate cached from uncached
  const uncachedNames = [];
  for (const name of packageNames) {
    if (cache.has(name)) {
      results.set(name, cache.get(name));
    } else {
      uncachedNames.push(name);
    }
  }

  // Query uncached in batches with concurrency limit
  for (let i = 0; i < uncachedNames.length; i += concurrency) {
    const batch = uncachedNames.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (name) => {
        const data = await queryVulnerabilities(name);
        const vulns = data.vulns || [];
        return { name, vulns };
      })
    );

    for (const { name, vulns } of batchResults) {
      cache.set(name, vulns);
      results.set(name, vulns);
    }
  }

  return results;
}

/**
 * Deduplicate vulnerabilities by ID across multiple packages
 * @param {Map<string, Array>} vulnsByPackage - Map of packageName -> vulnerabilities array
 * @returns {Array} Deduplicated array of vulnerability objects
 */
export function deduplicateVulnerabilities(vulnsByPackage) {
  const seen = new Map(); // id -> vuln object

  for (const [, vulns] of vulnsByPackage) {
    for (const vuln of vulns) {
      if (vuln.id && !seen.has(vuln.id)) {
        seen.set(vuln.id, vuln);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Fetch and analyze vulnerabilities for a package
 * @param {string} packageName - npm package name
 * @returns {Promise<Object>} CVE metrics
 */
export async function getPackageVulnerabilityMetrics(packageName) {
  const data = await queryVulnerabilities(packageName);
  const metrics = calculateCVEMetrics(data.vulns || []);
  return metrics;
}
