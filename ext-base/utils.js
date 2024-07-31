import { widgetPhase } from './constant';

export const convertGidToId = (gid) => {
  return gid.split('/').pop();
};

export const convertIdToGid = (id) => `gid://shopify/ProductVariant/${id}`;

export const genAttributeKey = (type) => `${type}_quote_id`;

export const extractFromLines = (lines) => {
  const brief = {};
  lines.forEach((line) => {
    const { merchandise, quantity } = line;
    const { id, product } = merchandise;
    // same variant ID with different property
    const prop = `${convertGidToId(product.id)}__${convertGidToId(id)}`;
    brief[prop] = (brief[prop] || 0) + quantity;
  });
  return brief;
};

// calculate prices when constructing cart
export const calculatePrices = ({ variant, cartLine }) => {
  const { compareAtPrice, price } = variant;
  const { quantity, cost } = cartLine;
  let finalPrice = parseInt(price.amount * 100);
  let finalLinePrice = parseInt(price.amount * quantity * 100);
  let discountedPrice = parseInt(price.amount * 100);
  let linePrice = parseInt(price.amount * quantity * 100);
  if (cost?.totalAmount?.amount !== undefined || cost?.totalAmount?.amount !== null) {
    const linePriceAmount = cost?.totalAmount?.amount;
    finalPrice = parseInt((linePriceAmount * 100) / quantity);
    discountedPrice = parseInt((linePriceAmount * 100) / quantity);
    finalLinePrice = parseInt(linePriceAmount * 100);
    linePrice = parseInt(linePriceAmount * 100);
  }

  return {
    price: parseInt(price.amount * 100),
    original_price: parseInt(price.amount * 100),
    discounted_price: discountedPrice,
    line_price: linePrice,
    final_price: finalPrice,
    final_line_price: finalLinePrice,
  };
};

export const splitSeelVariantsInCart = (api, { cart, quote, seelProductId }) => {
  const { lines } = api;
  if (!lines.current.length) {
    return [];
  }
  const seelVariants = lines.current.filter((line) => {
    const { merchandise } = line;
    const productId = convertGidToId(merchandise.product.id);
    return productId == (quote?.productId || seelProductId);
  });
  if (!seelVariants?.length) {
    return [];
  }

  let seelVariantMatchedWithQuote = null;
  const seelVariantsNotMatchedWithQuote = [];
  seelVariants.forEach((variant) => {
    const variantId = convertGidToId(variant.merchandise.id);
    if (quote?.variantId == variantId) {
      seelVariantMatchedWithQuote = variant;
    } else {
      seelVariantsNotMatchedWithQuote.push(variant);
    }
  });
  return [seelVariantMatchedWithQuote, seelVariantsNotMatchedWithQuote];
};

export const getPhaseName = (phase) => Object.entries(widgetPhase).find(([, value]) => phase === value);

export const formatMoney = (amount, locales) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: locales,
  }).format(amount);
