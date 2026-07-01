// Single implementation lives in loadTranslations.ts; re-export it here
// so gt-next can reference both paths (loadDictionaryPath + loadTranslationsPath)
// with a single source of truth.
export { default } from "./loadTranslations";
