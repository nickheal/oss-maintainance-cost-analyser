# OSS Maintainance Cost Analyser

A Node.js tool that analyzes npm dependencies to predict maintenance cost and future vulnerability risk. Instead of just showing current vulnerabilities, this tool helps you make informed decisions about which packages to adopt based on their historical vulnerability patterns, maintenance health, and complexity.

## 🎯 Purpose

This tool answers the question: **"How much effort will it take to keep these dependencies secure and up-to-date?"**

It provides:
- **Historical CVE frequency** - How often has this package had vulnerabilities?
- **Maintenance cost score** - A composite 0-100 score predicting future maintenance effort
- **Risk assessment** - LOW, MEDIUM, ELEVATED, HIGH, or CRITICAL risk levels
- **Estimated annual hours** - Rough estimate of maintenance time per package

## 💡 How to Use This Tool: The OSS Maintenance Budget Philosophy

### The Reality: OSS Packages Are Not Free

Incorporating an open source package into your codebase doesn't come for free. Every dependency you add requires ongoing maintenance:
- Updating to new versions when released
- Investigating and patching security vulnerabilities
- Dealing with breaking changes
- Debugging issues caused by dependency updates
- Monitoring for abandonment or security advisories

**The more OSS packages you add, the more time you spend maintaining them. If OSS maintenance grows unchecked, the time available for valuable feature work shrinks.**

### This Is Not Anti-OSS

To be clear: **This is NOT a call to stop using open source packages.** OSS is incredibly valuable and accelerates development.

This IS a call to:
- ✅ **Inspect the cost before including a package**
- ✅ **Remove old packages that aren't being used**
- ✅ **Be intentional about what you add to your dependency tree**
- ✅ **Measure and control your maintenance burden**

### Set an OSS Maintenance Budget

**Every team should establish an OSS maintenance budget.**

For example:
> "For our team of 5 developers, we're willing to spend **40 hours per year** on OSS package maintenance."

This budget represents time spent:
- Applying security patches
- Upgrading packages to avoid technical lag
- Investigating CVEs
- Testing after dependency updates
- Dealing with breaking changes

**Important:** This tool ONLY measures **OSS maintenance cost**. This is NOT a synonym for:
- ❌ Technical debt
- ❌ Overall maintenance cost
- ❌ Code quality issues
- ❌ Feature maintenance

It's measuring a **specific, narrow slice**: the time required to keep your OSS dependencies secure and up-to-date. But this slice should be measured and kept under control.

### How to Apply the Budget

#### 1. **Establish Your Baseline**
Run this tool against your current repositories:
```bash
npm start -- analyze --output current-state.json
```

Review the `totalMaintenanceHours` in the summary. This is your current annual OSS maintenance burden.

#### 2. **Set Your Budget**
Based on your team size and priorities, decide how many hours per year you're willing to allocate. Consider:
- Team size (larger teams can handle more)
- Project criticality (higher security requirements = more maintenance time)
- Available capacity (leave room for feature work)

Example budgets:
- Small team (2-3 devs): 20-30 hours/year
- Medium team (5-7 devs): 40-60 hours/year
- Large team (10+ devs): 80-100 hours/year

#### 3. **Track Against Your Budget**
Run this tool regularly (monthly or quarterly):
```bash
npm start -- analyze
```

If you're approaching or exceeding your budget:
- **Remove unused dependencies** - Audit and prune packages that aren't providing value
- **Consolidate packages** - Replace multiple packages with fewer, well-maintained alternatives
- **Defer new additions** - Hold off on adding new packages until you've reduced the burden

#### 4. **Evaluate Before Adding**
Before approving any new dependency:
```bash
npm start -- check new-package-name
```

Ask yourself:
- Will this push us over budget?
- Is the benefit worth the maintenance cost?
- Are there lower-maintenance alternatives?
- Can we build this ourselves in less time than maintaining the dependency?

#### 5. **Use Cost When Choosing Between Libraries**
When selecting between options:
```bash
npm start -- check moment
npm start -- check dayjs
npm start -- check date-fns
```

Consider the maintenance cost score alongside other factors:
- Features and capabilities
- Bundle size
- Community support
- **→ Maintenance burden ← (often overlooked!)**

#### 6. **Measure Throughput Accurately**
When measuring team throughput or velocity, account for OSS maintenance:

```
Available capacity = Total hours - OSS maintenance budget - Other overhead
```

If your budget is 40 hours/year for a team of 5:
- That's 8 hours per person per year
- Or ~0.15 hours per person per week
- This is time NOT available for feature work

Understanding this helps with realistic planning and prevents burnout from hidden maintenance work.

### Example Workflow

**Scenario:** You want to add a new charting library to your app.

1. **Check your current state:**
   ```bash
   npm start -- analyze
   # Current: 45 hours/year, Budget: 50 hours/year
   # Remaining capacity: 5 hours/year
   ```

2. **Evaluate the candidate:**
   ```bash
   npm start -- check chart.js
   # Result: 8 hours/year estimated maintenance
   ```

3. **Decision:**
   - Adding chart.js would put you at 53 hours/year (over budget by 3 hours)
   - Options:
     - Remove an unused package first to make room
     - Choose a lower-maintenance alternative
     - Increase your budget (accept less feature work)
     - Build a simple custom solution instead

4. **Execute:**
   ```bash
   # Option: Remove an old, unused package
   npm uninstall old-unused-package
   npm start -- analyze
   # New total: 40 hours/year
   # Now you have room for chart.js
   npm install chart.js
   ```

### Key Principles

1. **Visibility** - You can't manage what you don't measure
2. **Intentionality** - Every dependency should justify its maintenance cost
3. **Sustainability** - Keep maintenance burden within team capacity
4. **Trade-offs** - More dependencies = less time for features
5. **Hygiene** - Regularly remove packages you no longer need

### Remember

This tool provides **one dimension of cost** - OSS maintenance. Use it alongside other factors:
- Performance impact
- Bundle size
- Learning curve
- Licensing concerns
- Feature completeness

But don't ignore maintenance cost. It's real, it's measurable, and it compounds over time.

## 🚀 Quick Start

### Installation

```bash
cd /Users/nheal/dev/nickheal/oss-maintainance-cost-analyser
npm install
```

### Basic Usage

Analyze your project's dependencies:

```bash
npm start -- analyze
```

Analyze with detailed output:

```bash
npm start -- analyze --verbose
```

Check a single package:

```bash
npm start -- check express
```

Save results to a file:

```bash
npm start -- analyze --output results.json
```

## 📊 What Gets Analyzed

The tool calculates a composite **OSS Maintainance Cost Score (0-100)** based on:

### 1. Historical CVE Frequency (50% weight)
- Total CVEs discovered over the package's lifetime
- Average CVEs per year
- Critical and high-severity CVE rates
- Data sourced from [OSV.dev](https://osv.dev/)

### 2. Maintenance Health (10% weight)
- Last release date
- Release frequency
- Active maintenance status
- Data sourced from [deps.dev](https://deps.dev/)

### 3. Dependency Complexity (15% weight)
- Number of direct dependencies
- Estimated transitive dependency count
- Complexity level (low/moderate/high/very high)

### 4. Technical Lag (15% weight)
- How outdated is the current version?
- Are there unpatched known vulnerabilities?

### 5. Community Signals (10% weight)
- _Future enhancement - Currently placeholder score_

## 📋 Example Output

```
═══════════════════════════════════════════════════════════════════════════════
📊 PROJECT SUMMARY: my-awesome-app
═══════════════════════════════════════════════════════════════════════════════

Overall Score: 68/100
Total Annual Maintenance Effort: ~45 hours
Total Known CVEs: 23
Critical CVEs: 2

Risk Distribution:
   LOW: 12 packages
   MEDIUM: 8 packages
   ELEVATED: 3 packages
   HIGH: 2 packages
   CRITICAL: 0 packages

⚠️  Highest Risk Packages:
   lodash: 42 - HIGH (15 CVEs)
   moment: 38 - CRITICAL (8 CVEs)
   axios: 55 - ELEVATED (5 CVEs)
```

## 🔧 CLI Commands

### `analyze`
Analyze all dependencies in package.json

**Options:**
- `-p, --path <path>` - Path to package.json (default: `./package.json`)
- `-o, --output <path>` - Save JSON results to file
- `-d, --dev` - Include devDependencies
- `-v, --verbose` - Show detailed results for each package
- `-c, --concurrency <number>` - Max concurrent API requests (default: 5)

**Examples:**
```bash
# Analyze current project
npm start -- analyze

# Analyze with dev dependencies
npm start -- analyze --dev

# Analyze different project
npm start -- analyze --path ../other-project/package.json

# Save detailed results
npm start -- analyze --verbose --output analysis.json
```

### `check`
Analyze a single package (including all transitive dependencies)

**Usage:**
```bash
npm start -- check <package-name>
npm start -- check <package-name> --version <version>
npm start -- check <package-name> --shallow  # Only analyze direct package
```

**Examples:**
```bash
# Check latest version of express (including full dependency tree)
npm start -- check express

# Check specific version
npm start -- check lodash --version 4.17.21

# Check only the direct package without transitive dependencies
npm start -- check express --shallow
```

## 📈 Scoring Methodology

### Score Calculation

The composite score (0-100) is calculated as:

```
Score = (CVE_Score × 0.50) +
        (Maintenance_Score × 0.10) +
        (Complexity_Score × 0.15) +
        (TechnicalLag_Score × 0.15) +
        (Community_Score × 0.10)
```

Where **higher scores = lower risk** (100 = perfect, 0 = critical)

### Risk Levels

| Score Range | Risk Level | Meaning |
|------------|-----------|---------|
| 80-100 | LOW | Well-maintained, few vulnerabilities |
| 60-79 | MEDIUM | Acceptable risk, monitor regularly |
| 40-59 | ELEVATED | Consider alternatives, plan migration |
| 20-39 | HIGH | Avoid if possible, high maintenance burden |
| 0-19 | CRITICAL | Do not use, critical risk |

### Maintenance Hours Estimate

Estimated annual maintenance hours are calculated based on:
- **2 hours base** - Basic dependency updates
- **2 hours per CVE** - Investigation and patching
- **4 hours per critical CVE** - Testing and validation
- **0.2 hours per direct dependency** - General upkeep
- **+5-10 hours** - If package is poorly maintained (more debugging)

## 🏗️ Use Cases

### 1. **Dependency Approval Workflow**
Set threshold scores for new dependencies:
```bash
# In CI/CD
npm start -- check react
# Exit code 1 if score < 60
```

### 2. **Maintainance Cost Planning**
Estimate annual maintenance effort:
```bash
npm start -- analyze --output budget.json
# Review totalMaintenanceHours in summary
```

### 3. **Quarterly Security Reviews**
Track risk trends over time:
```bash
npm start -- analyze --output q1-2026.json
npm start -- analyze --output q2-2026.json
# Compare results quarterly
```

### 4. **Package Selection**
Compare alternatives before adoption:
```bash
npm start -- check moment
npm start -- check dayjs
npm start -- check date-fns
# Choose the one with best score
```

## 🔌 API Data Sources

### OSV.dev (Open Source Vulnerabilities)
- **Free, public API**
- Comprehensive vulnerability database
- Covers npm, PyPI, Go, Rust, and more
- Updated daily
- [Documentation](https://osv.dev/docs/)

### deps.dev
- **Free, public API by Google**
- Package metadata and dependency trees
- Release history and maintenance metrics
- No authentication required
- [Documentation](https://docs.deps.dev/api/v3/)

## ⚙️ Configuration

Currently, scoring weights are hardcoded in `src/scoring/calculator.js`:

```javascript
const WEIGHTS = {
  historicalCVEs: 0.50,
  maintenance: 0.10,
  complexity: 0.15,
  technicalLag: 0.15,
  communitySignals: 0.10,
};
```

Future enhancement: Allow custom weight configuration via `.ossbudgetrc` file.

## 📝 Output Format

### JSON Output Structure

When using `--output`, results are saved as:

```json
{
  "projectName": "my-app",
  "totalDependencies": 25,
  "packages": [
    {
      "packageName": "express",
      "version": "^4.18.0",
      "score": {
        "totalScore": 72,
        "riskLevel": "MEDIUM",
        "estimatedAnnualMaintenanceHours": 8,
        "breakdown": {
          "historicalCVEs": {
            "score": 65,
            "avgCVEsPerYear": 1.2,
            "criticalCVEsPerYear": 0.1
          },
          "maintenanceHealth": { ... },
          "dependencyComplexity": { ... },
          "technicalLag": { ... }
        }
      }
    }
  ],
  "summary": {
    "averageScore": 68,
    "totalMaintenanceHours": 45,
    "riskDistribution": { ... }
  }
}
```

## 🚧 Limitations

1. **Not a Crystal Ball** - Historical patterns don't guarantee future behavior
2. **Zero-day Vulnerabilities** - Cannot predict undiscovered vulnerabilities
3. **New Packages** - Limited data for recently published packages
4. **Rate Limiting** - Free APIs have rate limits (use `--concurrency` to adjust)
5. **Package Popularity Bias** - Popular packages may have more reported CVEs simply due to scrutiny

## 🛣️ Future Enhancements

- [ ] **Community signals integration** - GitHub stars, download trends, issue response time
- [x] **Transitive dependency analysis** - Full dependency tree scanning (completed)
- [ ] **HTML report generation** - Visual dashboards and charts
- [ ] **Configuration file** - Custom weights and thresholds
- [ ] **CI/CD integration** - GitHub Actions, GitLab CI support
- [ ] **Historical tracking** - Store and compare scores over time
- [ ] **Package recommendations** - Suggest safer alternatives
- [ ] **Socket.dev integration** - Add behavioral analysis scores
- [ ] **SBOM export** - Generate Software Bill of Materials

## 📚 Research & References

This tool is inspired by academic research and industry best practices:

- [DepReveal: On the Discoverability of npm Vulnerabilities](https://dl.acm.org/doi/10.1145/3571848)
- [Small World with High Risks: Security in npm Ecosystem](https://software-lab.org/publications/usenixSec2019-npm.pdf)
- [Technical Lag as Latent Technical Debt](https://www.arxiv.org/pdf/2601.11693)
- [FIRST EPSS - Exploit Prediction Scoring System](https://www.first.org/epss/)

## 📄 License

MIT

## 🤝 Contributing

This is an internal tool. For issues or feature requests, contact the security team.

---

**Built with ❤️ for proactive dependency security**
