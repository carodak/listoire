import { expect, it } from "vitest";
import { inventoryCategory } from "./inventory-category.ts";

it("groups game gear, consumables, and story facts into inventory tabs", () => {
  expect(inventoryCategory({ slot: "weapon" })).toBe("equipment");
  expect(inventoryCategory({ slot: "accessory" })).toBe("equipment");
  expect(inventoryCategory({ slot: "none", consumable: true })).toBe("consumables");
  expect(inventoryCategory({ slot: "none", consumable: false })).toBe("objects");
  expect(inventoryCategory({})).toBe("objects");
});
