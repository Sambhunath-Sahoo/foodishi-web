/**
 * A self-check for lib/sort.ts: `pnpm --filter operator check:sort`.
 *
 * Why a script and not a test file: the repo has no test runner, and adding a
 * framework (plus its config and lockfile churn) for one helper is the wrong
 * trade while three other apps are being built against the same lockfile. This
 * transpiles the real source with the TypeScript compiler the app already
 * depends on and runs plain `node:assert` against it, so it checks the code that
 * ships rather than a copy of it. When a runner lands, these cases move into it
 * unchanged.
 *
 * lib/sort.ts imports nothing, which is what lets it be loaded from a data: URL.
 */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/sort.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { sortRows, compareForSort } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const sortValues = (values, direction) =>
  sortRows(
    values.map((value) => ({ value })),
    { key: "value", direction },
    (row) => row.value,
  ).map((row) => row.value);

const cases = [
  // The ticket's own case (OP-8): a blank must not float above +14 min.
  ["[null,5,14] descending gives [14,5,null]", () =>
    assert.deepEqual(sortValues([null, 5, 14], "desc"), [14, 5, null])],
  ["[null,5,14] ascending gives [5,14,null]", () =>
    assert.deepEqual(sortValues([null, 5, 14], "asc"), [5, 14, null])],
  ["undefined sinks like null, both directions", () => {
    assert.deepEqual(sortValues([undefined, 3, null, 9], "desc"), [9, 3, undefined, null]);
    assert.deepEqual(sortValues([undefined, 3, null, 9], "asc"), [3, 9, undefined, null]);
  }],
  ["strings compare as text", () =>
    assert.deepEqual(sortValues(["Wok", null, "Anand"], "asc"), ["Anand", "Wok", null])],
  ["two missing values are equal", () =>
    assert.equal(compareForSort(null, undefined, "desc"), 0)],
  ["the input array is not mutated", () => {
    const input = [null, 5, 14].map((value) => ({ value }));
    const before = input.map((row) => row.value);
    sortRows(input, { key: "value", direction: "desc" }, (row) => row.value);
    assert.deepEqual(input.map((row) => row.value), before);
  }],
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}

if (failed > 0) {
  console.error(`${failed} of ${cases.length} sort checks failed`);
  process.exitCode = 1;
} else {
  console.log(`all ${cases.length} sort checks passed`);
}
