import {
  BlockSpacer,
  InlineStack,
  Checkbox,
  Style,
  Text,
  View,
  Link,
  Heading,
  Grid,
  BlockStack,
  TextBlock,
  Icon,
  Pressable,
} from '@shopify/ui-extensions/checkout';
import { queryNodeByProps } from '../services/index.js';
import { convertIdToGid, formatMoney } from '../utils.js';
import { createCard, createModal } from './widget-modal.js';

export const onChangeHandler =
  (root, api, { name, quote }) =>
  async (checked) => {
    const { lines, applyCartLinesChange } = api;
    const checkbox = queryNodeByProps(root, {
      id: `${name}-checkbox`,
    });
    if (checkbox) {
      checkbox.updateProps({ value: checked });
    }
    if (checked) {
      const resp = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: convertIdToGid(quote?.variantId),
        quantity: 1,
      }).catch(console.log);
      if (resp.type !== 'success' && checkbox) {
        checkbox.updateProps({ value: !checked });
      }
    } else {
      const cartLine = lines.current.find((line) => line.merchandise.id.includes(quote.variantId));
      if (cartLine?.id) {
        const resp = await applyCartLinesChange({
          type: 'removeCartLine',
          id: cartLine.id,
          quantity: cartLine.quantity || 1,
        }).catch(console.log);
        if (resp.type !== 'success' && checkbox) {
          checkbox.updateProps({ value: !checked });
        }
      }
    }
  };

export const createDescription = (quote) => {
  if (!quote) return null;
  const { currencyCode, price } = quote;
  return `Get a full refund if your order doesn’t arrive as described, including loss or damage in transit. Add for ${formatMoney(
    price,
    currencyCode
  )} ${currencyCode}`;
};

const createSpModal = (root) =>
  createModal(root, undefined, [
    root.createComponent(
      Grid,
      {
        columns: Style.default('fill').when({ viewportInlineSize: { min: 'small' } }, ['1fr', '1fr', '1fr']),
        spacing: 'base',
      },
      [
        createCard(root, {
          title: '1-click protect against',
          type: 'list',
          icon: 'https://lgw1a8rhxt8cm0bc-89218842937.shopifypreview.com/cdn/shop/files/circle-tick-minor.svg',
          contents: ['Loss', 'Damage', 'Delay'],
        }),
        createCard(root, {
          title: 'Instant resolution',
          type: 'block',
          icon: 'https://lgw1a8rhxt8cm0bc-89218842937.shopifypreview.com/cdn/shop/files/Group81592.svg',
          contents: ['Instantly resolve your shipment issues and get a refund or replacement with a few clicks.'],
        }),
        createCard(root, {
          title: 'Protect our planet',
          type: 'block',
          icon: 'https://lgw1a8rhxt8cm0bc-89218842937.shopifypreview.com/cdn/shop/files/Group81591.svg',
          contents: ['Part of your Worry-Free Purchase fee will fund green projects to offset emissions from shipping.'],
        }),
      ]
    ),
    root.createComponent(BlockSpacer, { spacing: 'loose' }),
    root.createComponent(BlockStack, { padding: ['none', 'extraLoose'] }, [
      root.createComponent(
        TextBlock,
        { inlineAlignment: 'center' },
        'Worry-Free Purchase offers peace of mind against package loss, damage, and theft, while offsetting carbon emissions from shipping for a greener planet. Should any covered incidents occur, use the ',
        root.createComponent(
          Link,
          { external: true, appearance: 'monochrome', to: 'https://www.seel.com' },
          'Seel Resolution Center'
        ),
        ' to resolve your package issue and get compensation up to the full value of your order!'
      ),
    ]),
  ]);

export default (root, { name, widgetStatus, quote }) => {
  const widget = root.createComponent(
    Grid,
    {
      id: `${name}-widget`,
      columns: ['auto', '1fr'],
      rows: ['auto'],
      border: 'base',
      cornerRadius: 'base',
      padding: 'base',
      spacing: ['extraTight', 'base'],
      blockAlignment: 'center',
    },
    [
      root.createComponent(
        Checkbox,
        {
          id: `${name}-checkbox`,
          value: Boolean(widgetStatus),
          disabled: true,
        },
        ''
      ),
      root.createComponent(
        InlineStack,
        {
          spacing: 'extraTight',
          padding: 'none',
          blockAlignment: 'center',
        },
        [
          root.createComponent(Heading, { level: '2' }, 'Worry-Free Purchase'),
          root.createComponent(
            Pressable,
            { overlay: createSpModal(root) },
            root.createComponent(Icon, {
              source: 'critical',
              appearance: 'base',
              size: 'small',
            })
          ),
        ]
      ),
      root.createComponent(View),
      root.createComponent(Text, { id: `${name}-description-text`, appearance: 'subdued' }, createDescription(quote)),
    ]
  );

  if (root.children.length) {
    const [firstChild] = root.children;
    const spacer = root.createComponent(BlockSpacer, { spacing: 'tight' });
    root.insertBefore(spacer, firstChild);
    root.insertBefore(widget, spacer);
  } else {
    root.appendChild(widget);
  }
};
