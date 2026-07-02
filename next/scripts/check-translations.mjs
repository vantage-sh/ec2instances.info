#!/usr/bin/env node
// Verifies that every locale under next/translations/ is a complete, valid
// translation of the en-US source of truth. Used by `npm run check-translations`,
// the CI "translations" job, and the .githooks/pre-commit hook.
//
// It fails (exit 1) when a locale:
//   - has a JSON file that does not parse,
//   - is MISSING a key that en-US defines (would fall back to English at runtime),
//   - has an EMPTY value for a key en-US fills, or
//   - drops/renames an ICU placeholder ({var}, {count, plural, ...}) that en-US uses.
//
// It intentionally does NOT flag values that are identical to en-US: brand and
// product names (os.*: "PostgreSQL", "SQL Server Enterprise", "Redis", ...) are
// correctly English in every locale, and many short strings legitimately match.
// The enforceable definition of "no untranslated strings" is structural
// completeness: no missing keys, no empty values, placeholders intact.
//
// To fill gaps this reports, see next/TRANSLATING.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRANSLATIONS_DIR = join(ROOT, "translations");
const SOURCE_LOCALE = "en-US";

function flatten(obj, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) {
            flatten(v, key, out);
        } else {
            out[key] = v;
        }
    }
    return out;
}

// ICU placeholders: {name}, {count, plural, ...}, {gender, select, ...}.
// We compare the set of top-level argument names, ignoring nested sub-messages.
function placeholders(value) {
    if (typeof value !== "string") return new Set();
    const names = new Set();
    const re = /\{\s*([a-zA-Z0-9_]+)\s*(?:,|\})/g;
    let m;
    while ((m = re.exec(value)) !== null) names.add(m[1]);
    return names;
}

function readJson(path) {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw); // throws on invalid JSON, caught by caller
}

function loadLocale(locale) {
    const dir = join(TRANSLATIONS_DIR, locale);
    const files = {};
    for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        files[f] = readJson(join(dir, f));
    }
    return files;
}

function main() {
    const source = loadLocale(SOURCE_LOCALE);
    const sourceFlat = {};
    for (const [file, obj] of Object.entries(source)) {
        sourceFlat[file] = flatten(obj);
    }

    const locales = readdirSync(TRANSLATIONS_DIR)
        .filter((d) => {
            try {
                return (
                    statSync(join(TRANSLATIONS_DIR, d)).isDirectory() &&
                    d !== SOURCE_LOCALE
                );
            } catch {
                return false;
            }
        })
        .sort();

    const failures = [];
    let okCount = 0;

    for (const locale of locales) {
        const problems = [];
        let files;
        try {
            files = loadLocale(locale);
        } catch (e) {
            failures.push(`${locale}: invalid JSON: ${e.message}`);
            continue;
        }

        for (const [file, srcFlat] of Object.entries(sourceFlat)) {
            const obj = files[file];
            if (obj === undefined) {
                problems.push(`${file}: file missing`);
                continue;
            }
            const flat = flatten(obj);
            const missing = [];
            const empty = [];
            const badPlaceholders = [];
            for (const [key, srcVal] of Object.entries(srcFlat)) {
                if (!(key in flat)) {
                    missing.push(key);
                    continue;
                }
                const val = flat[key];
                if (typeof val === "string" && val.trim() === "") {
                    empty.push(key);
                    continue;
                }
                const srcPh = placeholders(srcVal);
                if (srcPh.size > 0) {
                    const valPh = placeholders(val);
                    for (const p of srcPh) {
                        if (!valPh.has(p)) {
                            badPlaceholders.push(`${key} (missing {${p}})`);
                            break;
                        }
                    }
                }
            }
            if (missing.length)
                problems.push(
                    `${file}: ${missing.length} missing key(s): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", …" : ""}`,
                );
            if (empty.length)
                problems.push(
                    `${file}: ${empty.length} empty value(s): ${empty.slice(0, 8).join(", ")}${empty.length > 8 ? ", …" : ""}`,
                );
            if (badPlaceholders.length)
                problems.push(
                    `${file}: ${badPlaceholders.length} placeholder mismatch(es): ${badPlaceholders.slice(0, 8).join(", ")}`,
                );
        }

        if (problems.length) {
            failures.push(`${locale}:\n    ${problems.join("\n    ")}`);
        } else {
            okCount++;
        }
    }

    const total = locales.length;
    if (failures.length) {
        console.error(
            `\n✖ Translation check FAILED: ${failures.length}/${total} locale(s) incomplete (source: ${SOURCE_LOCALE}).\n`,
        );
        for (const f of failures) console.error(`  ${f}`);
        console.error(
            `\n${okCount}/${total} locale(s) complete.\n` +
                `To generate the missing translations with an LLM/agentic tool, see next/TRANSLATING.md.\n`,
        );
        process.exit(1);
    }

    console.log(
        `✔ Translation check passed: ${okCount}/${total} locale(s) complete against ${SOURCE_LOCALE}.`,
    );
}

main();
