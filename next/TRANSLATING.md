# Translating the UI

The site ships in **200 languages**. This doc explains how the translation
files are organized, how to add a new UI string, and how to generate the
translations for all locales with an LLM / agentic coding tool (e.g. Claude
Code) so the app has **no untranslated strings**.

## Layout

```
next/translations/
  en-US/            # source of truth (edit these first)
    common.json     #   nav, footer, instance-page labels, os names, exprHelp, localeSwitcher, …
    columns.json    #   table column headers
    errors.json     #   error messages
    filters.json    #   filter/sort UI
    pricing.json    #   pricing labels
  en-GB/ fr/ de/ ja/ ar/ …   # 199 more locales, same 5 files, same key set
```

- **`en-US` is the source of truth.** Every other locale must contain exactly
  the same keys.
- Values are looked up at runtime with `gt-next` (`useTranslations`/
  `getTranslations`). A missing key falls back to English, which is exactly the
  "untranslated string" we want to avoid.
- The files are **machine-generated locale data** and are `.prettierignore`d
  (2-space JSON). Do not hand-format them; their validity is enforced by the
  checker below, not by prettier.

## The completeness check

```bash
cd next && npm run check-translations
```

`scripts/check-translations.mjs` verifies, for every locale against `en-US`:

- every file parses as JSON,
- no key that `en-US` defines is **missing**,
- no value is **empty**,
- every ICU placeholder (`{name}`, `{count, plural, …}`) in the source is
  preserved in the translation.

It is wired in two places so gaps can't merge silently:

- **CI**: the `Translation completeness` job in `.github/workflows/tests.yml`.
- **pre-commit**: `.githooks/pre-commit` runs it whenever a commit touches
  `next/translations/` (the hook is enabled automatically by the `prepare`
  script on `npm install`). Bypass with `git commit --no-verify` if needed.

The check enforces **structural completeness**, not word-for-word difference
from English: brand/product names (`os.*`: `PostgreSQL`, `SQL Server
Enterprise`, `Redis`, …) are correctly English in every locale, and short
strings legitimately match. "No untranslated strings" here means "no missing
keys, no empty values, placeholders intact".

## Adding a new UI string

1. **Add the key to the `en-US` file** for the right namespace, e.g. in
   `translations/en-US/common.json`:

    ```json
    "myFeature": { "cta": "Compare instances" }
    ```

2. **Use it in code** via `gt-next`:

    ```tsx
    const t = useTranslations();
    // …
    {
        t("myFeature.cta");
    }
    ```

    Use ICU placeholders for interpolation: `"greeting": "Hi {name}"` →
    `t("greeting", { name })`.

3. **Fill it into all 199 other locales** (next section), then run
   `npm run check-translations` until it passes.

## Generating translations for all locales with an LLM / Claude Code

The 200 locales were produced by LLM translation triangulated from the existing
professionally-translated locales. To fill newly-added keys the same way, ask
Claude Code (or any agentic tool) to do the following. This is the exact
workflow used to add the `exprHelp` / `localeSwitcher` / sort keys.

**Prompt outline** (adapt the key list):

> You are a software-localization translator for a technical cloud-computing
> comparison site. I added these keys to `translations/en-US/<file>.json`:
> `<paste the English key/value pairs>`.
>
> For every locale directory under `next/translations/` except `en-US`,
> translate those strings into that language and add them to the matching
> `<file>.json`, keeping the existing 2-space JSON format and all existing keys.
>
> Rules:
>
> - Use each language's native script; write natural RTL text for Arabic/Hebrew/
>   etc. (the RTL set is in `utils/localeConstants.ts`).
> - Keep technical acronyms and brand names in English: EBS, NVMe, SSD, HDD,
>   AWS, and product names (PostgreSQL, Redis, …).
> - Preserve every ICU placeholder (`{...}`) exactly.
> - Preserve trailing punctuation (`:`, `...`, `.`, parentheses).
> - To calibrate register/terminology, read an existing translated file for the
>   locale first.
>
> Then run `npm run check-translations` and fix anything it reports.

**Tips for a large fan-out** (200 locales is a lot for one context):

- Split the locales into ~12 batches and run one subagent per batch in
  parallel; have each write a JSON file (`{ "<locale>": { …keys… } }`), then
  merge programmatically into the locale files with a consistent 2-space
  serializer. This keeps formatting uniform and avoids one agent juggling all
  200 languages. Endonyms for briefing agents are in
  `utils/localeConstants.ts` (`LOCALE_NAMES`).
- Always finish with `npm run check-translations`: it is the source of truth
  for whether the app is fully translated.
