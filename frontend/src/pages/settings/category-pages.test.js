import { describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("settings category pages", () => {
  it("wires inventory categories page to shared CategoryManager", async () => {
    mock.module("@/components/settings/CategoryManager", () => ({
      CategoryManager: (props) =>
        createElement(
          "div",
          null,
          `title:${props.title};category:${props.categoryPath("house-1")};items:${props.itemPath("house-1")}`
        ),
    }));

    const { default: InventoryCategoriesPage } = await import("./inventory-categories/page");
    const html = renderToStaticMarkup(createElement(InventoryCategoriesPage));

    expect(html).toContain("title:Inventory Categories");
    expect(html).toContain("/inventory/house-1/categories");
    expect(html).toContain("/inventory/house-1/items");
  });

  it("wires equipment categories page to shared CategoryManager", async () => {
    mock.module("@/components/settings/CategoryManager", () => ({
      CategoryManager: (props) =>
        createElement(
          "div",
          null,
          `title:${props.title};category:${props.categoryPath("house-1")};items:${props.itemPath("house-1")}`
        ),
    }));

    const { default: EquipmentCategoriesPage } = await import("./equipment-categories/page");
    const html = renderToStaticMarkup(createElement(EquipmentCategoriesPage));

    expect(html).toContain("title:Equipment Categories");
    expect(html).toContain("/equipment/house-1/categories");
    expect(html).toContain("/equipment/house-1");
  });
});
