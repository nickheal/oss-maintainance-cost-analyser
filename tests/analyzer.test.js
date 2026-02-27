import { describe, it, expect } from 'vitest';
import {
  extractDependencies,
  calculateProjectSummary,
} from '../src/analyzer.js';

describe('extractDependencies', () => {
  it('should extract production dependencies', () => {
    const packageJson = {
      dependencies: {
        express: '^4.18.0',
        lodash: '~4.17.0',
      },
    };

    const result = extractDependencies(packageJson, false);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'express', version: '^4.18.0', type: 'production' });
    expect(result[1]).toEqual({ name: 'lodash', version: '~4.17.0', type: 'production' });
  });

  it('should include dev dependencies when requested', () => {
    const packageJson = {
      dependencies: {
        express: '^4.18.0',
      },
      devDependencies: {
        jest: '^29.0.0',
        eslint: '^8.0.0',
      },
    };

    const result = extractDependencies(packageJson, true);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('production');
    expect(result[1].type).toBe('development');
    expect(result[2].type).toBe('development');
  });

  it('should return empty array for no dependencies', () => {
    const packageJson = {};
    const result = extractDependencies(packageJson, false);

    expect(result).toEqual([]);
  });

  it('should not include dev dependencies by default', () => {
    const packageJson = {
      dependencies: {
        express: '^4.18.0',
      },
      devDependencies: {
        jest: '^29.0.0',
      },
    };

    const result = extractDependencies(packageJson);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('express');
  });
});

describe('calculateProjectSummary', () => {
  it('should return null for empty package list', () => {
    const result = calculateProjectSummary([]);
    expect(result).toBeNull();
  });

  it('should calculate average score', () => {
    const packages = [
      {
        score: { totalScore: 80, riskLevel: 'LOW', estimatedAnnualMaintenanceHours: 5 },
        cveMetrics: { totalCVEs: 2, bySeverity: { CRITICAL: 0 } },
      },
      {
        score: { totalScore: 60, riskLevel: 'MEDIUM', estimatedAnnualMaintenanceHours: 10 },
        cveMetrics: { totalCVEs: 5, bySeverity: { CRITICAL: 1 } },
      },
    ];

    const result = calculateProjectSummary(packages);

    expect(result.averageScore).toBe(70);
    expect(result.totalMaintenanceHours).toBe(15);
    expect(result.totalCVEs).toBe(7);
    expect(result.totalCriticalCVEs).toBe(1);
  });

  it('should count risk distribution', () => {
    const packages = [
      { score: { totalScore: 90, riskLevel: 'LOW' }, cveMetrics: {} },
      { score: { totalScore: 85, riskLevel: 'LOW' }, cveMetrics: {} },
      { score: { totalScore: 65, riskLevel: 'MEDIUM' }, cveMetrics: {} },
      { score: { totalScore: 45, riskLevel: 'ELEVATED' }, cveMetrics: {} },
      { score: { totalScore: 25, riskLevel: 'HIGH' }, cveMetrics: {} },
      { score: { totalScore: 10, riskLevel: 'CRITICAL' }, cveMetrics: {} },
    ];

    const result = calculateProjectSummary(packages);

    expect(result.riskDistribution.LOW).toBe(2);
    expect(result.riskDistribution.MEDIUM).toBe(1);
    expect(result.riskDistribution.ELEVATED).toBe(1);
    expect(result.riskDistribution.HIGH).toBe(1);
    expect(result.riskDistribution.CRITICAL).toBe(1);
  });

  it('should identify highest risk packages', () => {
    const packages = [
      { packageName: 'pkg-safe', score: { totalScore: 90, riskLevel: 'LOW' }, cveMetrics: {} },
      { packageName: 'pkg-risky', score: { totalScore: 15, riskLevel: 'CRITICAL' }, cveMetrics: {} },
      { packageName: 'pkg-moderate', score: { totalScore: 55, riskLevel: 'ELEVATED' }, cveMetrics: {} },
    ];

    const result = calculateProjectSummary(packages);

    expect(result.highestRiskPackages).toHaveLength(3);
    expect(result.highestRiskPackages[0].name).toBe('pkg-risky');
    expect(result.highestRiskPackages[0].score).toBe(15);
  });
});
