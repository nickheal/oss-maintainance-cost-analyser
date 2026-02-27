import { describe, it, expect } from 'vitest';
import { resolveVersion } from '../../src/utils/version.js';

describe('resolveVersion', () => {
  const availableVersions = [
    '1.0.0',
    '1.2.0',
    '1.2.5',
    '2.0.0',
    '2.1.0',
    '3.0.0',
    '4.17.21',
    '4.18.0',
    '4.18.2',
  ];

  it('should return exact version if available', () => {
    const result = resolveVersion('2.1.0', availableVersions);
    expect(result).toBe('2.1.0');
  });

  it('should return null if exact version not available', () => {
    const result = resolveVersion('5.0.0', availableVersions);
    expect(result).toBeNull();
  });

  it('should resolve ^ range to latest compatible version', () => {
    const result = resolveVersion('^4.18.0', availableVersions);
    expect(result).toBe('4.18.2');
  });

  it('should resolve ~ range to latest patch version', () => {
    const result = resolveVersion('~1.2.0', availableVersions);
    expect(result).toBe('1.2.5');
  });

  it('should resolve >= range', () => {
    const result = resolveVersion('>=2.0.0', availableVersions);
    expect(result).toBe('4.18.2');
  });

  it('should return null for empty version list', () => {
    const result = resolveVersion('^1.0.0', []);
    expect(result).toBeNull();
  });

  it('should return null for null range', () => {
    const result = resolveVersion(null, availableVersions);
    expect(result).toBeNull();
  });

  it('should return null for undefined range', () => {
    const result = resolveVersion(undefined, availableVersions);
    expect(result).toBeNull();
  });

  it('should handle complex ranges', () => {
    const result = resolveVersion('>=1.0.0 <3.0.0', availableVersions);
    expect(result).toBe('2.1.0');
  });

  it('should return null if no versions satisfy range', () => {
    const result = resolveVersion('^10.0.0', availableVersions);
    expect(result).toBeNull();
  });
});
