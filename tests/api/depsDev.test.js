import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMaintenanceMetrics,
  calculateComplexityMetrics,
  getDependencyGraph,
  extractPackagesFromGraph,
} from '../../src/api/depsDev.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('calculateMaintenanceMetrics', () => {
  it('should return defaults for null input', () => {
    const result = calculateMaintenanceMetrics(null);

    expect(result.score).toBe(0);
    expect(result.lastReleaseDate).toBeNull();
    expect(result.releaseFrequency).toBe('unknown');
    expect(result.activelyMaintained).toBe(false);
  });

  it('should calculate metrics for active package', () => {
    const now = new Date();
    const recentDates = Array.from({ length: 8 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (i * 2));
      return date.toISOString();
    });

    const packageInfo = {
      versions: recentDates.map((date, i) => ({
        publishedAt: date,
        versionKey: { version: `${2 - Math.floor(i / 4)}.${i % 4}.0` },
      })),
    };

    const result = calculateMaintenanceMetrics(packageInfo);

    expect(result.score).toBeGreaterThan(40);
    expect(result.releaseFrequency).not.toBe('abandoned');
    expect(result.activelyMaintained).toBe(true);
  });

  it('should detect abandoned packages', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 5);

    const packageInfo = {
      versions: [
        { publishedAt: oldDate.toISOString(), versionKey: { version: '1.0.0' } },
      ],
    };

    const result = calculateMaintenanceMetrics(packageInfo);

    expect(result.score).toBeLessThan(50);
    expect(result.releaseFrequency).toBe('abandoned');
    expect(result.activelyMaintained).toBe(false);
  });

  it('should calculate days since last release', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 100);

    const packageInfo = {
      versions: [
        { publishedAt: recentDate.toISOString(), versionKey: { version: '1.0.0' } },
      ],
    };

    const result = calculateMaintenanceMetrics(packageInfo);

    expect(result.daysSinceLastRelease).toBeGreaterThan(90);
    expect(result.daysSinceLastRelease).toBeLessThan(110);
  });
});

describe('calculateComplexityMetrics', () => {
  it('should return defaults for null input', () => {
    const result = calculateComplexityMetrics(null);

    expect(result.score).toBe(100);
    expect(result.directDependencies).toBe(0);
    expect(result.totalDependencies).toBe(0);
    expect(result.complexityLevel).toBe('low');
  });

  it('should calculate metrics for package with few dependencies', () => {
    const versionInfo = {
      dependencies: [
        { name: 'dep1' },
        { name: 'dep2' },
        { name: 'dep3' },
      ],
    };

    const result = calculateComplexityMetrics(versionInfo);

    expect(result.directDependencies).toBe(3);
    expect(result.score).toBeGreaterThan(80);
    expect(result.complexityLevel).toBe('low');
  });

  it('should penalize packages with many dependencies', () => {
    const dependencies = Array.from({ length: 60 }, (_, i) => ({ name: `dep${i}` }));
    const versionInfo = { dependencies };

    const result = calculateComplexityMetrics(versionInfo);

    expect(result.directDependencies).toBe(60);
    expect(result.score).toBeLessThan(70);
    expect(result.complexityLevel).toBe('very high');
  });

  it('should estimate total dependencies', () => {
    const versionInfo = {
      dependencies: Array.from({ length: 10 }, (_, i) => ({ name: `dep${i}` })),
    };

    const result = calculateComplexityMetrics(versionInfo);

    expect(result.totalDependencies).toBe(150); // 10 * 15
  });
});

describe('getDependencyGraph', () => {
  it('should fetch dependency graph successfully', async () => {
    const mockGraph = {
      nodes: [
        { versionKey: { name: 'test-pkg', version: '1.0.0' }, relation: 'SELF' },
        { versionKey: { name: 'dep1', version: '2.0.0' }, relation: 'DIRECT' },
      ],
      edges: [],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGraph,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getDependencyGraph('test-pkg', '1.0.0');

    expect(result).toEqual(mockGraph);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/systems/npm/packages/test-pkg/versions/1.0.0:dependencies')
    );
  });

  it('should return null for 404 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getDependencyGraph('nonexistent', '1.0.0');

    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await getDependencyGraph('test-pkg', '1.0.0');

    expect(result).toBeNull();
  });
});

describe('extractPackagesFromGraph', () => {
  it('should extract unique packages from graph', () => {
    const graph = {
      nodes: [
        { versionKey: { name: 'pkg-a', version: '1.0.0' }, relation: 'SELF' },
        { versionKey: { name: 'pkg-b', version: '2.0.0' }, relation: 'DIRECT' },
        { versionKey: { name: 'pkg-c', version: '3.0.0' }, relation: 'INDIRECT' },
      ],
    };

    const result = extractPackagesFromGraph(graph);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'pkg-a', version: '1.0.0', relation: 'SELF' });
    expect(result[1]).toEqual({ name: 'pkg-b', version: '2.0.0', relation: 'DIRECT' });
    expect(result[2]).toEqual({ name: 'pkg-c', version: '3.0.0', relation: 'INDIRECT' });
  });

  it('should deduplicate packages', () => {
    const graph = {
      nodes: [
        { versionKey: { name: 'pkg-a', version: '1.0.0' }, relation: 'SELF' },
        { versionKey: { name: 'pkg-a', version: '1.0.0' }, relation: 'DIRECT' },
        { versionKey: { name: 'pkg-b', version: '2.0.0' }, relation: 'INDIRECT' },
      ],
    };

    const result = extractPackagesFromGraph(graph);

    expect(result).toHaveLength(2);
  });

  it('should return empty array for null graph', () => {
    const result = extractPackagesFromGraph(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for graph without nodes', () => {
    const result = extractPackagesFromGraph({});
    expect(result).toEqual([]);
  });

  it('should skip nodes without versionKey', () => {
    const graph = {
      nodes: [
        { versionKey: { name: 'pkg-a', version: '1.0.0' }, relation: 'SELF' },
        { relation: 'DIRECT' },
        { versionKey: { name: 'pkg-b', version: '2.0.0' }, relation: 'INDIRECT' },
      ],
    };

    const result = extractPackagesFromGraph(graph);

    expect(result).toHaveLength(2);
  });
});
