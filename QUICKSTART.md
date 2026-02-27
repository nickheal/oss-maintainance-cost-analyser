# Quick Start Guide

## Installation

```bash
cd /Users/nheal/dev/nickheal/oss-maintainance-cost-analyser
npm install
```

## The Core Idea: Set an OSS Maintenance Budget

**OSS packages aren't free.** Every dependency requires time for:
- Security patches
- Version updates
- Investigating CVEs
- Dealing with breaking changes

**More packages = less time for features.**

### What to Do

1. **Set a budget** - e.g., "40 hours/year for our team of 5"
2. **Measure your baseline** - Run this tool against your current repos
3. **Track regularly** - Monthly or quarterly checks
4. **Evaluate before adding** - Will this push you over budget?
5. **Remove unused packages** - Keep your dependency tree lean
6. **Choose wisely** - Use maintenance cost when selecting between libraries

**Important:** This measures ONLY OSS maintenance cost - a specific slice of overall maintenance, not all technical debt.

See the full README for detailed philosophy and workflow examples.

## Test with Example Package

Check a single package to see how it works:

```bash
npm start -- check lodash
```

This will analyze the `lodash` package and show:
- Overall score (0-100)
- Risk level (LOW/MEDIUM/ELEVATED/HIGH/CRITICAL)
- Historical CVE frequency
- Maintenance health
- Dependency complexity
- Estimated annual maintenance hours

## Analyze a Project

To test with the example project:

```bash
npm start -- analyze --path example-package.json --verbose
```

To analyze your own project:

```bash
# In your project directory
cd /path/to/your/project
/Users/nheal/dev/nickheal/oss-maintainance-cost-analyser/src/cli.js analyze

# Or from the analyzer directory
npm start -- analyze --path /path/to/your/project/package.json
```

## Common Commands

```bash
# Quick analysis (summary only)
npm start -- analyze

# Detailed analysis (all packages)
npm start -- analyze --verbose

# Include dev dependencies
npm start -- analyze --dev

# Save results to file
npm start -- analyze --output results.json

# Check single package (includes full dependency tree)
npm start -- check express
npm start -- check react --version 18.2.0

# Check only direct package without transitive dependencies
npm start -- check express --shallow

# Adjust concurrency (for rate limiting)
npm start -- analyze --concurrency 3
```

## Understanding the Output

### Score Interpretation

- **80-100 (LOW risk)**: Safe to use, well-maintained
- **60-79 (MEDIUM risk)**: Acceptable, monitor regularly
- **40-59 (ELEVATED risk)**: Consider alternatives
- **20-39 (HIGH risk)**: Avoid if possible
- **0-19 (CRITICAL risk)**: Do not use

### Maintenance Hours

This estimates how many hours per year you'll spend:
- Updating the package when new versions release
- Investigating and patching vulnerabilities
- Dealing with breaking changes
- Debugging issues caused by poor maintenance

### Risk Factors

Pay attention to:
- **High CVE frequency** (>2 per year) = package or its dependencies are often vulnerable
- **Abandoned packages** (no releases in 1+ years) = won't get security fixes
- **High complexity** (>200 total dependencies in tree) = more attack surface
- **Critical CVEs** (even 1 per year) = serious security issues

**Note**: CVE metrics now include the full transitive dependency tree. If a package has many dependencies, expect higher CVE counts even if the package itself is secure.

## Integration Examples

### CI/CD Pipeline

Add to your GitHub Actions:

```yaml
- name: Check dependency risk
  run: |
    npx /Users/nheal/dev/nickheal/oss-maintainance-cost-analyser/src/cli.js analyze
  # Fails if critical/high risk packages detected
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
if git diff --cached --name-only | grep -q "package.json"; then
  echo "Checking dependency security..."
  /Users/nheal/dev/nickheal/oss-maintainance-cost-analyser/src/cli.js analyze
fi
```

### Package Review Process

Before adding a new dependency:

```bash
# Check the package first
npm start -- check new-package-name

# If score > 60, approve it
# If score < 60, find an alternative
```

## Troubleshooting

### Rate Limiting

If you get rate limit errors, reduce concurrency:

```bash
npm start -- analyze --concurrency 2
```

Or add delays between batches in `src/analyzer.js`.

### Package Not Found

Some packages may not be in deps.dev. This is normal for:
- Very new packages (published recently)
- Private packages
- Packages removed from npm

The tool will still show CVE data from OSV.dev.

### No CVE Data

If a package shows 0 CVEs, it could mean:
- Genuinely no vulnerabilities found (good!)
- Package is too new to have been audited
- Package is unpopular and not scrutinized

Check the package's age and popularity before assuming it's safe.

## Next Steps

1. **Analyze your current projects** to establish a baseline
2. **Set score thresholds** for your team (e.g., "no packages below 50")
3. **Create a budget** based on total maintenance hours
4. **Review quarterly** to track trends
5. **Integrate into CI/CD** to prevent risky packages from being added

---

**Need help?** Check the full README.md for detailed documentation.
