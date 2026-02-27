#!/usr/bin/env node

/**
 * CLI Interface for OSS Maintainance Cost Analyser
 */

import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { analyzeProject, analyzePackage, saveResults } from "./analyzer.js";
import {
  formatProjectSummary,
  formatPackageResult,
  formatQuickSummary,
} from "./utils/formatter.js";

const program = new Command();

program
  .name("oss-maintainance-cost")
  .description(
    "Analyze npm dependencies to predict maintenance cost and vulnerability risk",
  )
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze package.json in the current directory")
  .option("-p, --path <path>", "Path to package.json", "./package.json")
  .option("-o, --output <path>", "Output file for JSON results")
  .option("-d, --dev", "Include devDependencies", false)
  .option("-v, --verbose", "Show detailed results for each package", false)
  .option("-c, --concurrency <number>", "Max concurrent API requests", "5")
  .action(async (options) => {
    try {
      const packageJsonPath = path.resolve(options.path);
      const maxConcurrent = parseInt(options.concurrency, 10);

      console.log(chalk.cyan.bold("\n🔍 OSS Maintainance Cost Analyser\n"));
      console.log(chalk.gray(`Analyzing: ${packageJsonPath}\n`));

      // Analyze project
      const results = await analyzeProject(packageJsonPath, {
        includeDev: options.dev,
        maxConcurrent,
      });

      // Display results
      if (options.verbose) {
        // Show detailed results for each package
        for (const pkg of results.packages) {
          console.log(formatPackageResult(pkg));
        }
      } else {
        // Show quick summary for each package
        console.log(chalk.bold("\n📦 Package Scores:\n"));
        for (const pkg of results.packages) {
          console.log("  " + formatQuickSummary(pkg));
        }
      }

      // Show project summary
      console.log(formatProjectSummary(results.summary, results.projectName));

      // Save to file if requested
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await saveResults(results, outputPath);
      }

      // Exit code based on risk
      if (results.summary) {
        const criticalCount = results.summary.riskDistribution.CRITICAL || 0;
        const highCount = results.summary.riskDistribution.HIGH || 0;

        if (criticalCount > 0) {
          console.log(
            chalk.red.bold("\n⚠️  WARNING: Critical risk packages detected!\n"),
          );
          process.exit(1);
        } else if (highCount > 3) {
          console.log(
            chalk.yellow.bold(
              "\n⚠️  WARNING: Multiple high-risk packages detected!\n",
            ),
          );
          process.exit(1);
        }
      }

      console.log(chalk.green.bold("\n✅ Analysis complete!\n"));
    } catch (error) {
      console.error(chalk.red.bold("\n❌ Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("check")
  .description("Check a single package")
  .argument("<package>", "Package name to analyze")
  .option("-v, --version <version>", "Specific version to check")
  .option(
    "-s, --shallow",
    "Only analyze the direct package, not transitive dependencies",
    false,
  )
  .action(async (packageName, options) => {
    try {
      console.log(
        chalk.cyan.bold(
          "\n🔍 OSS Maintainance Cost Analyser - Single Package Check\n",
        ),
      );

      const result = await analyzePackage(packageName, options.version, {
        shallow: options.shallow,
      });

      console.log(formatPackageResult(result));

      if (!result.found) {
        console.log(chalk.red("\n❌ Package not found or error occurred\n"));
        process.exit(1);
      }

      if (
        result.score.riskLevel === "CRITICAL" ||
        result.score.riskLevel === "HIGH"
      ) {
        console.log(
          chalk.red.bold("\n⚠️  WARNING: High-risk package detected!\n"),
        );
        process.exit(1);
      }

      console.log(chalk.green.bold("\n✅ Analysis complete!\n"));
    } catch (error) {
      console.error(chalk.red.bold("\n❌ Error:"), error.message);
      process.exit(1);
    }
  });

program
  .command("report")
  .description("Generate a detailed HTML report (future feature)")
  .action(() => {
    console.log(chalk.yellow("📄 HTML report generation coming soon!"));
  });

program.parse();
