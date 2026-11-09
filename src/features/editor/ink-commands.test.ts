import { describe, expect, it } from "vitest";
import { buildInkCommand } from "./ink-commands.ts";
import type { InkCommandInput } from "./ink-commands.ts";

const input = (change: Partial<InkCommandInput> = {}): InkCommandInput => ({
  name: "garden",
  label: "",
  condition: "",
  create: false,
  ...change,
});
const build = (command: string, change?: Partial<InkCommandInput>, knots: string[] = []) =>
  buildInkCommand(command, input(change), knots, "c1");

describe("buildInkCommand rejects text that would break the Ink script", () => {
  it.each([
    ["an empty name", { name: "" }],
    ["a name with spaces", { name: "the garden" }],
    ["a name starting with a digit", { name: "1garden" }],
    ["a path deeper than knot.stitch", { name: "a.b.c" }],
    ["a name that injects a divert", { name: "garden -> END" }],
  ])("%s", (_, change) => {
    expect(() => build("Divert", change)).toThrow("valid Ink identifier");
  });

  it.each([
    ["a newline", "Open\n-> END"],
    ["a carriage return", "Open\r"],
    ["a tag marker", "Open # choice:x"],
    ["an opening bracket", "Open [now"],
    ["a closing bracket", "Open] now"],
  ])("a choice label containing %s", (_, label) => {
    expect(() => build("Choice", { label })).toThrow("single line");
  });

  it.each([
    ["a newline", "seen\n~ x = 1"],
    ["an opening brace", "{seen"],
    ["a closing brace", "seen}"],
  ])("a condition containing %s", (_, condition) => {
    expect(() => build("Conditional Choice", { condition })).toThrow("without braces");
  });

  it("a knot, or a created destination, that already exists", () => {
    expect(() => build("Knot", {}, ["garden"])).toThrow("already exists");
    expect(() => build("Divert", { create: true }, ["garden"])).toThrow("already exists");
    expect(() => build("Divert", {}, ["garden"])).not.toThrow();
  });
});

describe("buildInkCommand writes each command", () => {
  it.each([
    ["Knot", "\n=== garden ===\nTODO: Translate this passage.\n-> END\n"],
    ["Stitch", "\n= garden\nTODO: Translate this passage.\n-> END\n"],
    ["Insert Variable", "{garden}"],
    ["Variable", "~ garden = 0\n"],
    ["Thread", "<- garden\n"],
    ["Tunnel", "-> garden ->\n"],
    ["Divert", "-> garden\n"],
  ])("%s", (command, ink) => {
    expect(build(command)).toBe(ink);
  });

  it("uses the label as a variable value and accepts knot.stitch paths", () => {
    expect(build("Variable", { label: "3" })).toBe("~ garden = 3\n");
    expect(build("Divert", { name: "garden.gate" })).toBe("-> garden.gate\n");
  });

  it("does not treat inherited object keys as commands", () => {
    expect(build("toString")).toBe("-> garden\n");
    expect(build("constructor")).toBe("-> garden\n");
  });

  it.each([
    ["Choice", "* [Continue # choice:c1]\n  -> garden\n"],
    ["Sticky Choice", "+ [Continue # choice:c1]\n  -> garden\n"],
    ["Nested Choice", "** [Continue # choice:c1]\n  -> garden\n"],
  ])("%s with the default label", (command, ink) => {
    expect(build(command)).toBe(ink);
  });

  it("adds the label and condition to a choice", () => {
    expect(build("Conditional Choice", { label: "Open it", condition: "has_key" })).toBe(
      "* {has_key} [Open it # choice:c1]\n  -> garden\n",
    );
  });

  it("appends the created destination, returning from tunnels", () => {
    expect(build("Divert", { create: true })).toBe(
      "-> garden\n\n=== garden ===\nTODO: Translate this passage.\n-> END\n",
    );
    expect(build("Tunnel", { create: true })).toBe(
      "-> garden ->\n\n=== garden ===\nTODO: Translate this passage.\n->->\n",
    );
  });
});
