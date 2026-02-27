import { describe, it, expect } from 'vitest';
import {
  calculateCVEScore,
  calculateTechnicalLagScore,
  estimateMaintenanceHours,
  getRiskLevel,
  calculateCompositeScore,
} from '../../src/scoring/calculator.js';

describe('calculateCVEScore', () => {
  it('should return 100 for no CVEs', () => {
    const metrics = { totalCVEs: 0 };
    expect(calculateCVEScore(metrics)).toBe(100);
  });

  it('should penalize based on avg CVEs per year', () => {
    const metrics = { totalCVEs: 50, avgCVEsPerYear: 5.5 };
    const score = calculateCVEScore(metrics);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should heavily penalize high CVE frequency', () => {
    const metrics = { totalCVEs: 100, avgCVEsPerYear: 12 };
    const score = calculateCVEScore(metrics);
    expect(score).toBeLessThan(40);
  });

  it('should penalize critical CVEs', () => {
    const metrics = { totalCVEs: 10, avgCVEsPerYear: 1, criticalCVEsPerYear: 2.5 };
    const score = calculateCVEScore(metrics);
    expect(score).toBeLessThan(80);
  });

  it('should clamp score to 0-100 range', () => {
    const metrics = { totalCVEs: 1000, avgCVEsPerYear: 100, criticalCVEsPerYear: 50, highCVEsPerYear: 50 };
    const score = calculateCVEScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('calculateTechnicalLagScore', () => {
  it('should return 100 for fresh releases with no CVEs', () => {
    const cveMetrics = { bySeverity: { CRITICAL: 0, HIGH: 0 } };
    const maintenanceMetrics = { daysSinceLastRelease: 30 };
    expect(calculateTechnicalLagScore(cveMetrics, maintenanceMetrics)).toBe(100);
  });

  it('should penalize stale packages', () => {
    const cveMetrics = { bySeverity: {} };
    const maintenanceMetrics = { daysSinceLastRelease: 800 };
    const score = calculateTechnicalLagScore(cveMetrics, maintenanceMetrics);
    expect(score).toBeLessThan(70);
  });

  it('should penalize unpatched critical CVEs', () => {
    const cveMetrics = { bySeverity: { CRITICAL: 3, HIGH: 2 } };
    const maintenanceMetrics = { daysSinceLastRelease: 100 };
    const score = calculateTechnicalLagScore(cveMetrics, maintenanceMetrics);
    expect(score).toBeLessThan(80);
  });
});

describe('estimateMaintenanceHours', () => {
  it('should return base hours for minimal metrics', () => {
    const metrics = { cve: {}, metadata: {} };
    const hours = estimateMaintenanceHours(metrics);
    expect(hours).toBeGreaterThanOrEqual(2);
  });

  it('should add hours for CVEs', () => {
    const metrics = {
      cve: { avgCVEsPerYear: 5, criticalCVEsPerYear: 2 },
      metadata: { complexity: { directDependencies: 0 } },
    };
    const hours = estimateMaintenanceHours(metrics);
    expect(hours).toBeGreaterThan(10);
  });

  it('should add hours for abandoned packages', () => {
    const metrics = {
      cve: {},
      metadata: {
        maintenance: { releaseFrequency: 'abandoned' },
        complexity: {},
      },
    };
    const hours = estimateMaintenanceHours(metrics);
    expect(hours).toBeGreaterThanOrEqual(12);
  });
});

describe('getRiskLevel', () => {
  it('should return LOW for scores 80-100', () => {
    expect(getRiskLevel(100)).toBe('LOW');
    expect(getRiskLevel(80)).toBe('LOW');
  });

  it('should return MEDIUM for scores 60-79', () => {
    expect(getRiskLevel(79)).toBe('MEDIUM');
    expect(getRiskLevel(60)).toBe('MEDIUM');
  });

  it('should return ELEVATED for scores 40-59', () => {
    expect(getRiskLevel(59)).toBe('ELEVATED');
    expect(getRiskLevel(40)).toBe('ELEVATED');
  });

  it('should return HIGH for scores 20-39', () => {
    expect(getRiskLevel(39)).toBe('HIGH');
    expect(getRiskLevel(20)).toBe('HIGH');
  });

  it('should return CRITICAL for scores 0-19', () => {
    expect(getRiskLevel(19)).toBe('CRITICAL');
    expect(getRiskLevel(0)).toBe('CRITICAL');
  });
});

describe('calculateCompositeScore', () => {
  it('should calculate weighted composite score', () => {
    const cveMetrics = { totalCVEs: 0, avgCVEsPerYear: 0, criticalCVEsPerYear: 0, highCVEsPerYear: 0, bySeverity: {} };
    const packageMetrics = {
      maintenance: { score: 100, daysSinceLastRelease: 10, releaseFrequency: 'active', activelyMaintained: true },
      complexity: { score: 100, directDependencies: 5, complexityLevel: 'low' },
    };
    const result = calculateCompositeScore(cveMetrics, packageMetrics);

    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('estimatedAnnualMaintenanceHours');
    expect(result).toHaveProperty('breakdown');
    expect(result.totalScore).toBeGreaterThan(80);
    expect(result.riskLevel).toBe('LOW');
  });

  it('should include all breakdown components', () => {
    const cveMetrics = { totalCVEs: 5, avgCVEsPerYear: 1, criticalCVEsPerYear: 0, highCVEsPerYear: 0, bySeverity: {} };
    const packageMetrics = {
      maintenance: { score: 80, lastReleaseDate: '2024-01-01', releaseFrequency: 'moderate', activelyMaintained: true },
      complexity: { score: 70, directDependencies: 15, complexityLevel: 'moderate' },
    };
    const result = calculateCompositeScore(cveMetrics, packageMetrics);

    expect(result.breakdown).toHaveProperty('historicalCVEs');
    expect(result.breakdown).toHaveProperty('maintenanceHealth');
    expect(result.breakdown).toHaveProperty('dependencyComplexity');
    expect(result.breakdown).toHaveProperty('technicalLag');
    expect(result.breakdown).toHaveProperty('communitySignals');
  });
});
