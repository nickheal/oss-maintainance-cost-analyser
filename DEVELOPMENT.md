# Development Guide

## Project Structure

```
oss-maintainance-cost-analyser/
├── src/
│   ├── api/               # API clients for external services
│   │   ├── osv.js        # OSV.dev API client (CVE data)
│   │   └── depsDev.js    # deps.dev API client (package metadata)
│   ├── scoring/          # Scoring logic
│   │   └── calculator.js # Composite score calculation
│   ├── utils/            # Utility functions
│   │   └── formatter.js  # Console output formatting
│   ├── analyzer.js       # Main analysis orchestration
│   └── cli.js           # CLI interface (entry point)
├── package.json
├── README.md
├── QUICKSTART.md
└── DEVELOPMENT.md (this file)
```

## Architecture

### Data Flow

```
CLI (cli.js)
  ↓
Analyzer (analyzer.js)
  ↓
  ├─→ OSV.dev API (osv.js) → CVE metrics
  └─→ deps.dev API (depsDev.js) → Package metadata
  ↓
Scoring Calculator (calculator.js) → Composite score
  ↓
Formatter (formatter.js) → Console output
```

### Key Components

#### 1. API Clients (`src/api/`)

**osv.js** - Queries OSV.dev for vulnerability data
- `queryVulnerabilities(packageName)` - Fetch CVEs for a package
- `calculateCVEMetrics(vulnerabilities)` - Calculate frequency metrics
- `getPackageVulnerabilityMetrics(packageName)` - High-level interface

**depsDev.js** - Queries deps.dev for package metadata
- `getPackageInfo(packageName)` - Fetch package info
- `getVersionInfo(packageName, version)` - Fetch version-specific info
- `calculateMaintenanceMetrics(packageInfo)` - Calculate maintenance score
- `calculateComplexityMetrics(versionInfo)` - Calculate complexity score

#### 2. Scoring Engine (`src/scoring/calculator.js`)

Combines metrics into a composite score (0-100):

- **Weights**: Configurable in `WEIGHTS` constant
- **CVE Score**: Based on historical vulnerability frequency
- **Technical Lag Score**: Based on package age and unpatched CVEs
- **Composite Score**: Weighted average of all metrics
- **Maintenance Hours**: Estimates annual effort
- **Risk Level**: Categorizes score into LOW/MEDIUM/ELEVATED/HIGH/CRITICAL

#### 3. Analyzer (`src/analyzer.js`)

Orchestrates the analysis workflow:

- `readPackageJson(filePath)` - Parse package.json
- `extractDependencies(packageJson, includeDev)` - Get dependency list
- `analyzePackage(packageName, version)` - Analyze single package
- `analyzeProject(packageJsonPath, options)` - Analyze all dependencies
- `calculateProjectSummary(packages)` - Generate summary stats

#### 4. Formatter (`src/utils/formatter.js`)

Handles console output formatting:

- `formatScore(score)` - Color-coded score display
- `formatRisk(risk)` - Color-coded risk level
- `formatPackageResult(result)` - Detailed package report
- `formatProjectSummary(summary)` - Project summary report
- `formatQuickSummary(result)` - One-line package summary

#### 5. CLI (`src/cli.js`)

Command-line interface using Commander.js:

- `analyze` command - Analyze project dependencies
- `check` command - Check single package
- Exit codes based on risk levels

## Adding New Features

### Example: Add GitHub Stars to Community Signals

1. **Create GitHub API client** (`src/api/github.js`):
```javascript
export async function getRepoStars(packageName) {
  // Query GitHub API
  // Return star count
}
```

2. **Update scoring calculator** (`src/scoring/calculator.js`):
```javascript
export function calculateCommunityScore(githubData) {
  let score = 50;
  if (githubData.stars > 10000) score += 20;
  // ... more logic
  return score;
}
```

3. **Integrate in analyzer** (`src/analyzer.js`):
```javascript
const githubData = await getGithubMetrics(packageName);
const communityScore = calculateCommunityScore(githubData);
```

4. **Update formatter** for display

### Example: Add Custom Weights Configuration

1. **Create config file** (`.ossbudgetrc`):
```json
{
  "weights": {
    "historicalCVEs": 0.40,
    "maintenance": 0.30,
    "complexity": 0.15,
    "technicalLag": 0.10,
    "communitySignals": 0.05
  }
}
```

2. **Update calculator** to read config:
```javascript
import { readConfig } from './utils/config.js';
const WEIGHTS = readConfig() || DEFAULT_WEIGHTS;
```

## Testing

The project uses **Vitest** for testing with full ES module support.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch
```

### Test Structure

```
tests/
├── api/
│   ├── osv.test.js         - OSV API and CVE metrics
│   ├── depsDev.test.js     - deps.dev API and package metrics
├── scoring/
│   └── calculator.test.js  - Composite score calculation
├── utils/
│   └── version.test.js     - Version resolution
└── analyzer.test.js        - Main analyzer orchestration
```

### Manual Testing

```bash
# Test single package check with transitive analysis
npm start -- check express

# Test shallow (direct-only) analysis
npm start -- check express --shallow

# Test with example file
npm start -- analyze --path example-package.json --verbose

# Test with your own project
npm start -- analyze --path /path/to/real/package.json
```

## API Rate Limiting

Both APIs are free and public, but have rate limits:

**OSV.dev**: No documented limit, but be respectful
**deps.dev**: No authentication required, generous limits

To avoid issues:
- Default concurrency is 5 (adjustable via `--concurrency`)
- Add delays between batches if needed
- Cache results when possible

### Adding Caching

```javascript
// src/utils/cache.js
const cache = new Map();

export function getCached(key, ttl = 3600000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.value;
  }
  return null;
}

export function setCache(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}
```

## Debugging

Enable verbose logging:

```javascript
// In any file
const DEBUG = process.env.DEBUG === 'true';
if (DEBUG) console.log('Debug info:', data);
```

Run with:
```bash
DEBUG=true npm start -- analyze
```

## Code Style

- ES6 modules (`import`/`export`)
- Async/await for asynchronous operations
- JSDoc comments for public functions
- Descriptive variable names
- Keep functions small and focused

## Dependencies

Minimal dependencies to keep the tool lightweight:

**Runtime:**
- **chalk** - Terminal color output
- **commander** - CLI argument parsing
- **semver** - Version range resolution for dependency trees

**Development:**
- **vitest** - Testing framework with ES module support

No runtime dependencies on security scanners or heavy libraries.

## Future Enhancements

See README.md for planned features. Priority order:

1. **Community signals** - GitHub integration
2. **Configuration file** - Custom weights/thresholds
3. ~~**Transitive deps**~~ - ✅ Completed (full dependency tree analysis)
4. **HTML reports** - Visual dashboards
5. **CI/CD integration** - GitHub Actions plugin
6. **Historical tracking** - Store results over time
7. **Socket.dev integration** - Behavioral analysis

## Contributing

Internal tool - contact the security team for access or questions.

### Making Changes

1. Create a feature branch
2. Test thoroughly with real package.json files
3. Update documentation (README, QUICKSTART, this file)
4. Submit for review

---

**Questions?** Contact the development team.
