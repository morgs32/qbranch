import { Effect } from "effect";
import { access, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsSource = join(repoRoot, "skills");

export const program = Effect.fn("symlink-skills")(() =>
  Effect.gen(function* () {
    const cwd = process.cwd();
    const packageJsonPath = join(cwd, "package.json");
    const skillsDestination = join(cwd, "skills");

    yield* Effect.tryPromise({
      try: () => access(packageJsonPath),
      catch: (cause) =>
        new Error(
          `Expected to run in a working directory with package.json: ${String(cause)}`,
        ),
    });

    yield* Effect.tryPromise({
      try: () => access(skillsSource),
      catch: (cause) =>
        new Error(`Missing skills source directory: ${String(cause)}`),
    });

    yield* Effect.tryPromise({
      try: () => rm(skillsDestination, { recursive: true, force: true }),
      catch: (cause) =>
        new Error(`Failed to clear destination: ${String(cause)}`),
    });

    yield* Effect.tryPromise({
      try: () => cp(skillsSource, skillsDestination, { recursive: true }),
      catch: (cause) =>
        new Error(`Failed to copy skills into ${skillsDestination}: ${String(cause)}`),
    });
  }),
);
