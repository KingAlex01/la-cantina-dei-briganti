import assert from "node:assert/strict";
import test from "node:test";
import { isSiteLanguage, resolveLanguage, SUPPORTED_LANGUAGES } from "../lib/i18n/languages.ts";

test("the public site uses the same four languages as the translated menu", () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["it", "en", "es", "fr"]);
  assert.equal(isSiteLanguage("fr"), true);
  for (const value of ["de", "EN", "en-US", "", null, undefined]) {
    assert.equal(isSiteLanguage(value), false);
  }
});

test("a saved manual choice wins over the browser preference", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    assert.equal(resolveLanguage("es-ES,fr;q=0.9", language), language);
  }
  assert.equal(resolveLanguage(null, "en"), "en");
});

test("invalid saved values do not override the browser preference", () => {
  for (const saved of ["de", "FR", "fr-CA", "", "__proto__", "<script>"]) {
    assert.equal(resolveLanguage("fr-CA,en;q=0.8", saved), "fr");
  }
});

test("an absent or empty browser preference defaults to Italian", () => {
  for (const header of [null, "", "  "]) {
    assert.equal(resolveLanguage(header), "it");
  }
});

test("regional and mixed-case browser language tags use the available translation", () => {
  for (const [header, expected] of [
    ["it-CH,it;q=0.9", "it"],
    ["en-US,en;q=0.9", "en"],
    ["es-MX,es;q=0.9", "es"],
    ["FR-ca,fr;q=0.9", "fr"],
    ["  es-ES ; q=0.9 , en ; q=0.5 ", "es"],
  ]) {
    assert.equal(resolveLanguage(header), expected);
  }
});

test("quality weights outrank order and ties preserve browser order", () => {
  assert.equal(resolveLanguage("en;q=0.3,fr;q=0.9,it;q=0.6"), "fr");
  assert.equal(resolveLanguage("es;q=0.8,fr;q=0.8"), "es");
  assert.equal(resolveLanguage("fr;q=0.8,es;q=0.8"), "fr");
  assert.equal(resolveLanguage("de-DE,es;q=0.8,en;q=0.6"), "es");
});

test("zero quality excludes a language from negotiation and fallback", () => {
  assert.equal(resolveLanguage("en;q=0,fr;q=.8"), "fr");
  assert.equal(resolveLanguage("de-DE,en;q=0"), "it");
  assert.equal(resolveLanguage("it;q=0,*;q=0.8"), "en");
  assert.equal(resolveLanguage("de,it;q=0,en;q=0"), "es");
});

test("malformed language tags and quality weights are ignored safely", () => {
  for (const header of [
    "fr;q=abc,en;q=.5",
    "fr;q=1.1,en;q=.5",
    "fr;q=-1,en;q=.5",
    "fr;q=Infinity,en;q=.5",
    "<script>,en;q=.5",
    "fr_FR,en;q=.5",
  ]) {
    assert.equal(resolveLanguage(header), "en");
  }
});

test("unsupported languages use English when no supported preference remains", () => {
  assert.equal(resolveLanguage("de-DE,de;q=0.9"), "en");
  assert.equal(resolveLanguage("ja-JP,zh-Hant;q=0.8"), "en");
  assert.equal(resolveLanguage("malformed_header"), "en");
});

test("a wildcard permits Italian while an explicit supported choice takes priority", () => {
  assert.equal(resolveLanguage("*"), "it");
  assert.equal(resolveLanguage("de-DE,*;q=0.5"), "it");
  assert.equal(resolveLanguage("*;q=1,fr;q=0.8"), "fr");
});
