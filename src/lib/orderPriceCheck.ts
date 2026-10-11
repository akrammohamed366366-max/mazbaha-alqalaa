import { OrderRecord, MenuItem } from '../types';

export interface PriceCheckResult {
  hasDifference: boolean;
  differences: {
    itemName: string;
    variantLabel: string;
    orderPrice: number;
    menuPrice: number;
  }[];
}

/**
 * Recomputes every line item against the current menu.
 * If any line item's unitPrice differs from the menu, flags it.
 */
export function checkOrderPriceDifferences(
  order: OrderRecord,
  menuItems: MenuItem[]
): PriceCheckResult {
  const differences: PriceCheckResult['differences'] = [];

  for (const line of order.items || []) {
    const dish = menuItems.find((m) => m.id === line.itemId);
    if (!dish) {
      differences.push({
        itemName: line.name,
        variantLabel: line.variantLabel,
        orderPrice: line.unitPrice,
        menuPrice: 0,
      });
      continue;
    }

    const variant = dish.variants.find((v) => v.id === line.variantId);
    if (!variant) {
      differences.push({
        itemName: line.name,
        variantLabel: line.variantLabel,
        orderPrice: line.unitPrice,
        menuPrice: 0,
      });
      continue;
    }

    if (variant.price !== line.unitPrice) {
      differences.push({
        itemName: line.name,
        variantLabel: line.variantLabel,
        orderPrice: line.unitPrice,
        menuPrice: variant.price,
      });
    }
  }

  return {
    hasDifference: differences.length > 0,
    differences,
  };
}
