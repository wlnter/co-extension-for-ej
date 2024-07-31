import { snapshot } from 'valtio/vanilla';
import { subscribeKey } from 'valtio/utils';
import {
  getMerchantConfig,
  constructCart,
  createQuote,
  getOrCreateDeviceId,
  getOrCreateUserId,
  queryNodeByProps,
  updateCart,
  updateCartAttributes,
} from './services/index.js';
import { extractFromLines, convertGidToId, splitSeelVariantsInCart, genAttributeKey, getPhaseName } from './utils.js';
import { widgetPhase, quoteSource, quoteStatus, broadcastChannel } from './constant.js';
import { performanceMarker, performanceMeasure } from './perf.js';

const { INIT, LOADING, PROCESSING, QUOTING, CARTING, RENDERING, BINDING, COMPLETION } = widgetPhase;
const { CHECKOUT } = quoteSource;
const { ACCEPTED } = quoteStatus;

const subscriber = async (
  phase,
  { store, channel },
  { renderWidget, createDescription, onChangeHandler },
  { root, api }
) => {
  const { name, type } = snapshot(store);
  const { checkoutToken, cost, extension, shop } = api;
  performanceMarker(phase);
  if (phase === INIT) {
    console.log(`${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(), `-> UI extension (${name}) initialized`);
    store.next = true;
  } else if (phase === LOADING) {
    store.merchantConfig = await getMerchantConfig(api, {
      type,
    });
    console.log(
      `${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(),
      `-> Merchant config ${JSON.stringify(snapshot(store.merchantConfig))}`
    );
    if (store.merchantConfig?.status === 'active') {
      store.next = true;
    }
  } else if (phase === PROCESSING) {
    const { linesBrief } = snapshot(store);
    const items = await constructCart(api);
    store.cart = {
      items,
      token: checkoutToken.current,
      currency: cost.totalAmount.current.currencyCode,
    };
    console.log(`${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(), `-> Cart brief ${JSON.stringify(linesBrief)}`);
    store.userId = await getOrCreateUserId(api);
    store.deviceId = await getOrCreateDeviceId(api);
    store.next = true;
  } else if (phase === QUOTING) {
    const { cart, userId, deviceId, seelProductId } = snapshot(store);
    store.quote = await createQuote(api, {
      type,
      source: CHECKOUT,
      cart,
      userId,
      deviceId,
    });
    store.seelProductId = store.quote?.productId || seelProductId;
    console.log(
      `${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(),
      `-> Quote created (${store.quote?.quoteId}), the variant ID is ${store.quote?.variantId} and premium price is ${store.quote?.price}.`
    );
    store.next = true;
  } else if (phase === CARTING) {
    const { cart, quote, merchantConfig, seelProductId } = snapshot(store);
    const [seelVariantMatchedWithQuote, seelVariantsNotMatchedWithQuote] = splitSeelVariantsInCart(api, {
      cart,
      quote,
      seelProductId,
    });

    const checkboxElement = queryNodeByProps(root, {
      id: `${name}-checkbox`,
    });
    if (checkboxElement) {
      store.currentWidgetStatus = checkboxElement.props.value;
    } else {
      store.currentWidgetStatus = Boolean(seelVariantMatchedWithQuote || merchantConfig?.defaultOpt === 'true');
    }
    channel.postMessage(
      `${name} will update cart -> ${JSON.stringify({
        seelVariantMatchedWithQuote,
        seelVariantsNotMatchedWithQuote,
      })}`
    );
    const result = await updateCart(api, {
      quote,
      currentWidgetStatus: store.currentWidgetStatus,
      seelVariantMatchedWithQuote,
      seelVariantsNotMatchedWithQuote,
    });
    console.log(
      `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
      `-> Cart lines updated ${JSON.stringify(result)}.`
    );
    switch (result?.operation) {
      case 'updateCartLine':
        break;
      case 'removeCartLine':
        if (!result?.succeed) {
          store.currentWidgetStatus = true;
        }
        break;
      case 'addCartLine':
        if (!result?.succeed) {
          store.currentWidgetStatus = false;
        }
        break;
      default:
        break;
    }

    updateCartAttributes(api, {
      [genAttributeKey(type)]: quote?.quoteId || '',
    });

    store.next = true;
  } else if (phase === RENDERING) {
    const { name, currentWidgetStatus, quote, merchantConfig } = snapshot(store);
    const staledWidget = queryNodeByProps(root, {
      id: `${name}-widget`,
    });
    if (quote?.status !== ACCEPTED) {
      if (staledWidget) {
        root.removeChild(staledWidget);
        console.log(
          `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
          `-> Widget was removed due to no valid quote.`
        );
      } else {
        console.log(
          `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
          `-> Widget should not be rendered due to no valid quote.`
        );
      }
    } else {
      if (staledWidget) {
        const descriptionText = queryNodeByProps(root, {
          id: `${name}-description-text`,
        });
        descriptionText.replaceChildren(root.createText(createDescription(quote)));
        const checkbox = queryNodeByProps(root, { id: `${name}-checkbox` });
        checkbox.updateProps({
          value: currentWidgetStatus,
          disabled: true,
        });
        console.log(
          `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
          `-> Widget should be re-rendered, the description is "${createDescription(quote)}", the checkbox status is ${
            currentWidgetStatus ? 'check' : 'uncheck'
          } and disabled.`
        );
      } else {
        renderWidget(root, {
          name,
          widgetStatus: currentWidgetStatus,
          quote,
          merchantConfig,
          shopName: shop.name,
        });
        console.log(
          `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
          `-> Widget should be appended, the checkbox status is ${
            currentWidgetStatus ? 'check' : 'uncheck'
          } and disabled.`
        );
      }
    }
    console.log(
      `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
      `-> ${extension.rendered.current ? 'Widget rendering succeeded' : 'Widget rendering failed'}`
    );
    if (extension.rendered.current) {
      store.next = true;
    }
  } else if (phase === BINDING) {
    const { quote, name } = snapshot(store);
    const checkbox = queryNodeByProps(root, {
      id: `${name}-checkbox`,
    });
    if (checkbox) {
      checkbox.updateProps({
        onChange: onChangeHandler(root, api, { name, quote }),
        disabled: false,
      });
      console.log(
        `${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(),
        `-> Checkbox is enabled and event handlers are binded`
      );
    }
    store.next = true;
  } else if (phase === COMPLETION) {
    console.log(`${type}->${getPhaseName(phase)?.[0] || phase}`.toUpperCase(), `-> Ready for user input`);
    performanceMeasure();
  }
};

const observer = async (lines, store, { root, api }) => {
  const { type, linesBrief, quote, phase, seelProductId, name } = snapshot(store);
  const brief = extractFromLines(lines);
  const intersection = Object.keys(brief).filter((id) => Object.keys(linesBrief).includes(id));
  const added = {};
  const removed = {};
  const updated = {};
  Object.entries(brief).forEach(([key, value]) => {
    if (!intersection.includes(key)) {
      added[key] = value;
    }
  });
  Object.entries(linesBrief).forEach(([key, value]) => {
    if (!intersection.includes(key)) {
      removed[key] = value;
    }
  });
  Object.entries(brief).forEach(([key, value]) => {
    if (intersection.includes(key) && value != linesBrief[key]) {
      updated[key] = value;
    }
  });
  store.linesBrief = brief;

  // merhcandise changed
  if (Object.keys(added).length || Object.keys(removed).length || Object.keys(updated).length) {
    let shouldUpdateQuote = false;
    let shouldUpdateCart = false;
    Object.entries({ ...added, ...removed, ...updated }).forEach(([key]) => {
      const [productId] = key.split('__');
      if (productId != (quote?.productId || seelProductId)) {
        shouldUpdateQuote = true;
      } else {
        shouldUpdateCart = true;
      }
    });
    console.log(
      `${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(),
      `-> Cart mutation captured`,
      JSON.stringify({ added, removed, updated })
    );

    if (shouldUpdateCart || shouldUpdateQuote) {
      const checkbox = queryNodeByProps(root, {
        id: `${name}-checkbox`,
      });
      if (checkbox) {
        checkbox.updateProps({
          disabled: true,
        });
      }
    }

    if (shouldUpdateQuote) {
      console.log(
        `${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(),
        `-> Cart mutation captured, checkbox disabled and a new quote should be created.`
      );
      store.phase = PROCESSING;
    } else if (shouldUpdateCart && phase > CARTING) {
      console.log(
        `${type}->${getPhaseName(phase)?.[0]}`.toUpperCase(),
        `-> Cart mutation captured, checkbox disabled and the quantity and price of the insurance product(s) should be re-validated and updated.`
      );
      store.phase = CARTING;
    }
  }
};

export const initialization = (root, api, store, { renderWidget, createDescription, onChangeHandler }) => {
  const channel = new BroadcastChannel(broadcastChannel);
  channel.addEventListener('message', (event) => {
    console.log(`${name} received message`, event.data);
  });

  subscribeKey(store, 'phase', async (value) => {
    try {
      await subscriber(
        value,
        { store, channel },
        {
          renderWidget,
          createDescription,
          onChangeHandler,
        },
        { root, api }
      );
    } catch (error) {
      console.log(`Caught error in subscriber (${getPhaseName(store.phase)?.[0] || store.phase}):`, error);
    }
  });

  api.lines.subscribe(async (lines) => {
    try {
      await observer(lines, store, { root, api });
    } catch (error) {
      console.log(`Caught error in observer (${getPhaseName(store.phase)?.[0] || store.phase}):`, error);
    }
  });

  store.phase = widgetPhase.INIT;
  store.linesBrief = extractFromLines(api.lines.current);

  return [store, channel];
};
