import { v4 as uuidv4 } from 'uuid';
import { insuranceType } from '../constant.js';
import { camelCase, mapKeys } from 'lodash-es';

const { BP, SP, RA } = insuranceType;

export const getMerchantConfig = async (api, { type }) => {
  const { shop } = api;
  const { myshopifyDomain } = shop;
  let url = `https://api.seel.com/gateway/merchant-service/api/cart-configs-v2/${myshopifyDomain}`;
  if (type === RA) {
    url = `${url}?type=${type.toUpperCase()}`;
  }
  if (type === SP) {
    url = `https://api.seel.com/gateway/merchant-service/api/query-shopify-bp-config?shopDomain=${myshopifyDomain}`;
  }
  const resp = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${uuidv4()}__${Date.now()}`,
    },
    body: null,
    method: 'GET',
  });
  const { code, data } = await resp.json();
  if (code === 0 && data) {
    if (type === RA || type === BP) {
      return {
        status: data?.meta?.live ? 'active' : 'void',
        defaultOpt: data?.meta?.checked ? 'true' : 'false',
        returnConfig: mapKeys(data?.return_config, (_v, k) => camelCase(k)),
      };
    } else {
      const { status, defaultOpt } = data;
      return {
        status,
        defaultOpt,
      };
    }
  } else {
    return null;
  }
};

export const createQuote = async (api, { type, source, cart, userId, deviceId }) => {
  const { shop } = api;
  const { myshopifyDomain } = shop;
  const quoteServicePath = Object.freeze({
    ra: 'ra',
    bp: '17bp',
    sp: 'bp',
  });
  const resp = await fetch(`https://api.seel.com/gateway/quotes-service/api/${quoteServicePath[type]}-quotes`, {
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${uuidv4()}__${Date.now()}`,
    },
    body: JSON.stringify({
      source,
      cart_info: cart,
      customer_info: {
        timestamp_in_ms: Date.now(),
        user_id: userId,
        device_id: deviceId,
      },
      shop_domain: myshopifyDomain,
    }),
    method: 'POST',
  });
  const quote = await resp.json();
  if (type === RA && quote) {
    return {
      currencyCode: quote.currencyCode,
      currencySymbol: quote.currencySymbol,
      quoteId: quote.quote_id,
      eligibleItems: quote.eligible_items.map((obj) => {
        return mapKeys(obj, (_v, k) => camelCase(k));
      }),
      price: quote.ra_price,
      variantId: quote.ra_variant_id,
      value: quote.ra_value,
      productId: quote.ra_product_id,
      status: quote.status,
    };
  } else if ((type === BP || type === SP) && quote?.data) {
    return {
      currencyCode: quote.data.currencyCode,
      currencySymbol: quote.data.currencySymbol,
      quoteId: quote.data.quote_id,
      eligibleItems: quote.data.eligible_items.map((obj) => {
        return mapKeys(obj, (_v, k) => camelCase(k));
      }),
      price: quote.data.bp_price,
      variantId: quote.data.bp_variant_id,
      value: quote.data.bp_value,
      productId: quote.data.bp_product_id,
      status: quote.data.status,
    };
  } else {
    return null;
  }
};
