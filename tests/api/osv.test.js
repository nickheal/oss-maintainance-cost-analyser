import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCVEMetrics,
  queryVulnerabilitiesBatch,
  deduplicateVulnerabilities,
} from '../../src/api/osv.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('calculateCVEMetrics', () => {
  it('should return zero metrics for empty array', () => {
    const result = calculateCVEMetrics([]);

    expect(result.totalCVEs).toBe(0);
    expect(result.avgCVEsPerYear).toBe(0);
    expect(result.criticalCVEsPerYear).toBe(0);
    expect(result.bySeverity.CRITICAL).toBe(0);
    expect(result.oldestCVE).toBeNull();
  });

  it('should count vulnerabilities correctly', () => {
    const vulns = [
      { id: 'CVE-1', published: '2023-01-15T00:00:00Z', database_specific: { severity: 'HIGH' } },
      { id: 'CVE-2', published: '2023-06-20T00:00:00Z', database_specific: { severity: 'MODERATE' } },
      { id: 'CVE-3', published: '2024-03-10T00:00:00Z', database_specific: { severity: 'CRITICAL' } },
    ];

    const result = calculateCVEMetrics(vulns);

    expect(result.totalCVEs).toBe(3);
    expect(result.bySeverity.HIGH).toBe(1);
    expect(result.bySeverity.MODERATE).toBe(1);
    expect(result.bySeverity.CRITICAL).toBe(1);
  });

  it('should calculate per-year metrics correctly', () => {
    const vulns = [
      { id: 'CVE-1', published: '2020-01-01T00:00:00Z', database_specific: { severity: 'HIGH' } },
      { id: 'CVE-2', published: '2024-01-01T00:00:00Z', database_specific: { severity: 'LOW' } },
    ];

    const result = calculateCVEMetrics(vulns);

    expect(result.yearsOfData).toBeGreaterThan(3);
    expect(result.avgCVEsPerYear).toBeGreaterThan(0);
    expect(result.avgCVEsPerYear).toBeLessThan(1);
  });

  it('should handle CVSS severity scores', () => {
    const vulns = [
      {
        id: 'CVE-1',
        published: '2023-01-01T00:00:00Z',
        severity: [{ type: 'CVSS_V3', score: '9.5' }],
      },
      {
        id: 'CVE-2',
        published: '2023-02-01T00:00:00Z',
        severity: [{ type: 'CVSS_V3', score: '7.2' }],
      },
      {
        id: 'CVE-3',
        published: '2023-03-01T00:00:00Z',
        severity: [{ type: 'CVSS_V3', score: '3.1' }],
      },
    ];

    const result = calculateCVEMetrics(vulns);

    expect(result.bySeverity.CRITICAL).toBe(1);
    expect(result.bySeverity.HIGH).toBe(1);
    expect(result.bySeverity.LOW).toBe(1);
  });

  it('should track oldest and newest CVE dates', () => {
    const vulns = [
      { id: 'CVE-1', published: '2020-06-15T00:00:00Z' },
      { id: 'CVE-2', published: '2024-12-01T00:00:00Z' },
      { id: 'CVE-3', published: '2022-03-20T00:00:00Z' },
    ];

    const result = calculateCVEMetrics(vulns);

    expect(result.oldestCVE).toBe('2020-06-15');
    expect(result.newestCVE).toBe('2024-12-01');
  });

  it('should count CVEs by year', () => {
    const vulns = [
      { id: 'CVE-1', published: '2020-01-01T00:00:00Z' },
      { id: 'CVE-2', published: '2020-06-01T00:00:00Z' },
      { id: 'CVE-3', published: '2023-01-01T00:00:00Z' },
    ];

    const result = calculateCVEMetrics(vulns);

    expect(result.byYear[2020]).toBe(2);
    expect(result.byYear[2023]).toBe(1);
  });
});

describe('queryVulnerabilitiesBatch', () => {
  it('should query multiple packages', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vulns: [{ id: 'CVE-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vulns: [{ id: 'CVE-2' }] }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await queryVulnerabilitiesBatch(['pkg-a', 'pkg-b']);

    expect(result.get('pkg-a')).toEqual([{ id: 'CVE-1' }]);
    expect(result.get('pkg-b')).toEqual([{ id: 'CVE-2' }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should use cache to avoid duplicate queries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ vulns: [{ id: 'CVE-NEW' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const cache = new Map();
    cache.set('pkg-a', [{ id: 'CVE-CACHED' }]);

    const result = await queryVulnerabilitiesBatch(['pkg-a', 'pkg-b'], { cache });

    expect(result.get('pkg-a')).toEqual([{ id: 'CVE-CACHED' }]);
    expect(result.get('pkg-b')).toEqual([{ id: 'CVE-NEW' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should respect concurrency limit', async () => {
    let concurrentCalls = 0;
    let maxConcurrentCalls = 0;

    const mockFetch = vi.fn(async () => {
      concurrentCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCalls--;
      return { ok: true, json: async () => ({ vulns: [] }) };
    });
    vi.stubGlobal('fetch', mockFetch);

    await queryVulnerabilitiesBatch(['pkg1', 'pkg2', 'pkg3', 'pkg4', 'pkg5', 'pkg6'], {
      concurrency: 2,
    });

    expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
  });

  it('should handle packages with no vulnerabilities', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ vulns: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await queryVulnerabilitiesBatch(['safe-pkg']);

    expect(result.get('safe-pkg')).toEqual([]);
  });
});

describe('deduplicateVulnerabilities', () => {
  it('should deduplicate by vulnerability ID', () => {
    const vulnsByPackage = new Map([
      ['pkg-a', [{ id: 'CVE-1', data: 'from-a' }, { id: 'CVE-2', data: 'from-a' }]],
      ['pkg-b', [{ id: 'CVE-1', data: 'from-b' }, { id: 'CVE-3', data: 'from-b' }]],
    ]);

    const result = deduplicateVulnerabilities(vulnsByPackage);

    expect(result).toHaveLength(3);
    const ids = result.map((v) => v.id).sort();
    expect(ids).toEqual(['CVE-1', 'CVE-2', 'CVE-3']);
  });

  it('should preserve first occurrence of duplicate', () => {
    const vulnsByPackage = new Map([
      ['pkg-a', [{ id: 'CVE-1', source: 'pkg-a' }]],
      ['pkg-b', [{ id: 'CVE-1', source: 'pkg-b' }]],
    ]);

    const result = deduplicateVulnerabilities(vulnsByPackage);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('pkg-a');
  });

  it('should handle empty maps', () => {
    const result = deduplicateVulnerabilities(new Map());
    expect(result).toEqual([]);
  });

  it('should handle vulnerabilities without IDs', () => {
    const vulnsByPackage = new Map([
      ['pkg-a', [{ id: 'CVE-1' }, { data: 'no-id' }]],
    ]);

    const result = deduplicateVulnerabilities(vulnsByPackage);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CVE-1');
  });
});
