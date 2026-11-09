export type InventoryCategory = "equipment" | "consumables" | "objects";

/** The current item contract has two equipment slots and one consumable flag.
 * Narrative objects without slots are always ordinary items. */
export function inventoryCategory(item: {
  id?: string;
  slot?: string;
  consumable?: boolean;
}): InventoryCategory {
  if (item.slot && item.slot !== "none") return "equipment";
  if (item.consumable) return "consumables";
  return "objects";
}
