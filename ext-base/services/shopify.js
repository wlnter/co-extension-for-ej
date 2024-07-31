import { v4 as uuidv4 } from "uuid";
import { storageKey, quoteStatus } from "../constant.js";
import { calculatePrices, convertGidToId, convertIdToGid } from "../utils.js";
const { ACCEPTED } = quoteStatus;

export const getProductVariant = async ({ shop, query }, line) => {
  // 看到query中的双引号了么，老子调了半年
  const { errors, data } = await query(
    `query {
      product(id: "${btoa(line.productId)}") {
        ... on Product {
          id
          title
          handle
          description
          isGiftCard
          productType
          featuredImage {
            altText
            height
            width
            url
          }
        }
      }
      node(id: "${btoa(line.variantId)}") {
        ... on ProductVariant {
          id
          title
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          sku
          taxable
          image {
            altText
            height
            width
            url
          }
        }
      }
    }`,
  );
  if (errors) {
    console.log(
      `Syntax error in GraphQL query: ${errors
        .map((err) => err.message)
        .join(",")}`,
    );
    return null;
  } else if (data) {
    const { node: variant, product } = data;
    return { variant, product, cartLine: line.cartLine };
  } else {
    console.log(`Failed to get product information using GraphQL query`);
    return null;
  }
};

export const constructCart = async ({ lines, shop, query }) => {
  const itemsInCart = lines.current.map((line) => {
    const { merchandise, quantity, cost, attributes } = line;
    const { id, product } = merchandise;
    return {
      variantId: id,
      productId: product.id,
      cartLine: { quantity, cost, attributes, merchandise },
    };
  });
  let items = await Promise.all(
    itemsInCart.map((item) => getProductVariant({ lines, shop, query }, item)),
  );
  items = items.filter(Boolean) || [];
  const cartLines = items.map(({ variant, product, cartLine }) => {
    const { quantity, merchandise } = cartLine;
    const {
      price,
      original_price,
      discounted_price,
      line_price,
      final_price,
      final_line_price,
    } = calculatePrices({ variant, product, cartLine });
    return {
      id: convertGidToId(variant.id),
      quantity,
      variant_id: convertGidToId(variant.id),
      title: `${product.title} - ${variant.title}`,
      price,
      original_price,
      discounted_price,
      line_price,
      final_price,
      final_line_price,
      sku: variant.sku,
      product_id: convertGidToId(product.id),
      requires_shipping: merchandise.requiresShipping,
      vendor: merchandise.product.vendor,
      product_title: product.title,
      variant_title: variant.title,
    };
  });
  return cartLines;
};

/**
 * `user_id:`  Generated using uuidv4 and persisted through the Storage API,
 * has a lifecycle bound to the current checkout session. It will remain available
 * throughout the duration of the buyer's active checkout process. However, upon
 * initiating a new checkout session, the previously stored user ID will be reset,
 * and a new identifier must be generated and persisted for the latest session.
 *
 * `device_id`: For registered and logged-in users, the obfuscated user ID provided
 * by SPO is used as the device_id; For unregistered users, a device_id can be
 * generated based on the user information provided.
 */
export const getOrCreateUserId = async ({ storage }) => {
  let userId = await storage.read(storageKey.USER_ID);
  if (!userId) {
    userId = uuidv4();
    storage.write(storageKey.USER_ID, userId);
  }
  return userId;
};

export const getOrCreateDeviceId = async ({ storage }) => {
  let deviceId = await storage.read(storageKey.DEVICE_ID);
  if (!deviceId) {
    deviceId = uuidv4();
    storage.write(storageKey.DEVICE_ID, deviceId);
  }
  return deviceId;
};

export const updateCartAttributes = async (
  { applyAttributeChange },
  attributes,
) => {
  const result = await Promise.all(
    Object.entries(attributes).map(([key, value]) =>
      applyAttributeChange({
        type: "updateAttribute",
        key,
        value,
      }),
    ),
  ).catch(console.log);
  return result;
};

export const queryNodeByProps = (root, property) => {
  for (let i = 0, len = root?.children?.length; i < len; i++) {
    const child = root.children[i];
    if (child?.props) {
      let matched = true;
      Object.entries(property).forEach(([key, value]) => {
        if (child.props[key] !== value) {
          matched = false;
        }
      });
      if (matched) {
        return child;
      } else {
        const found = queryNodeByProps(child, property);
        if (found) {
          return found;
        }
      }
    } else {
      const found = queryNodeByProps(child, property);
      if (found) {
        return found;
      }
    }
  }
};

export const updateCart = async (
  api,
  {
    quote,
    currentWidgetStatus,
    seelVariantMatchedWithQuote,
    seelVariantsNotMatchedWithQuote,
  },
) => {
  const { applyCartLinesChange } = api;
  // Remove variant whose variantId is not matched with quote
  const promises =
    seelVariantsNotMatchedWithQuote?.map((variant) => {
      return applyCartLinesChange({
        type: "removeCartLine",
        id: String(variant.id),
        quantity: variant.quantity,
      });
    }) || [];
  await Promise.all(promises);
  // add variant matched with quote
  if (currentWidgetStatus && quote?.status === ACCEPTED) {
    if (seelVariantMatchedWithQuote) {
      const { id, merchandise, quantity } = seelVariantMatchedWithQuote;
      if (quantity !== 1) {
        const resp = await applyCartLinesChange({
          type: "updateCartLine",
          id: String(id),
          merchandiseId: String(merchandise?.id),
          quantity: 1,
        }).catch(console.log);
        return {
          operation: "updateCartLine",
          succeed: resp?.type === "success",
        };
      }
    } else {
      const resp = await applyCartLinesChange({
        type: "addCartLine",
        merchandiseId: convertIdToGid(quote.variantId),
        quantity: 1,
      }).catch(console.log);
      return { operation: "addCartLine", succeed: resp?.type === "success" };
    }
  } else {
    // Remove variant whose productId is the same as seelProductId
    if (seelVariantMatchedWithQuote) {
      const { id, quantity } = seelVariantMatchedWithQuote;
      const resp = await applyCartLinesChange({
        type: "removeCartLine",
        id: String(id),
        quantity,
      });
      return { operation: "removeCartLine", succeed: resp?.type === "success" };
    }
  }
};
