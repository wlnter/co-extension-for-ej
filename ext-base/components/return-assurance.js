import {
  BlockLayout,
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
  Divider,
  Pressable,
  List,
  ListItem,
} from "@shopify/ui-extensions/checkout";
import { queryNodeByProps } from "../services/index.js";
import { convertIdToGid, formatMoney } from "../utils.js";
import { createCard, createModal } from "./widget-modal.js";

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
        type: "addCartLine",
        merchandiseId: convertIdToGid(quote?.variantId),
        quantity: 1,
      }).catch(console.log);
      if (resp.type !== "success" && checkbox) {
        checkbox.updateProps({ value: !checked });
      }
    } else {
      const cartLine = lines.current.find((line) =>
        line.merchandise.id.includes(quote.variantId)
      );
      if (cartLine?.id) {
        const resp = await applyCartLinesChange({
          type: "removeCartLine",
          id: cartLine.id,
          quantity: cartLine.quantity || 1,
        }).catch(console.log);
        if (resp.type !== "success" && checkbox) {
          checkbox.updateProps({ value: !checked });
        }
      }
    }
  };

export const createDescription = (quote, returnWindow = "-") => {
  if (!quote) return null;
  const { currencyCode, price, value } = quote;
  return `You have item(s) worth ${formatMoney(
    value,
    currencyCode
  )} in your cart that are final sale. For ${formatMoney(
    price,
    currencyCode
  )}, you can add an option within ${returnWindow} days to return these item(s) if they don’t work out for any reason.`;
};

function createReturnToSeelModal(
  root,
  { returnConfig = {}, currencyCode = "USD" }
) {
  const {
    returnWindow = "-",
    resolutionCenterLink = "https://www.seel.com",
    returnShippingFee,
  } = returnConfig;
  return createModal(root, undefined, [
    root.createComponent(
      Grid,
      {
        columns: Style.default("fill").when(
          { viewportInlineSize: { min: "small" } },
          ["1fr", "1fr", "1fr"]
        ),
        spacing: "base",
      },
      [
        createCard(root, {
          title: "Return for any reason",
          type: "list",
          icon: "https://cdn.seel.com/assets/images/circle-tick-minor.svg",
          contents: [
            "Item doesn’t fit",
            "No longer needed",
            "Dissatisfied with items",
            "Arrived too late",
          ],
        }),
        createCard(root, {
          title: `${returnWindow}-day return window`,
          type: "block",
          icon: "https://cdn.seel.com/assets/images/premiumInsurance_PurchaseProtection_1.svg",
          contents: [
            `Return in ${returnWindow} days.`,
            "Shop with confidence.",
          ],
        }),
        createCard(root, {
          title: "Easy resolution",
          type: "block",
          icon: "https://cdn.seel.com/assets/images/Group81592.svg",
          contents: [
            "Resolve your return request and get refunded with a few clicks.",
          ],
        }),
      ]
    ),
    root.createComponent(BlockSpacer, { spacing: "small" }),
    root.createComponent(BlockStack, { padding: ["none", "extraLoose"] }, [
      root.createComponent(TextBlock, { inlineAlignment: "center" }, [
        `Make it Returnable gives you a ${returnWindow}-day return window on otherwise final sale (non-refundable) items. If you’re unhappy with the purchase for any reason, Seel will buy it back from you for 100% of the purchase price you paid. You can use the `,
        root.createComponent(
          Link,
          {
            external: true,
            appearance: "monochrome",
            to: resolutionCenterLink,
          },
          "Seel Resolution Center"
        ),
        " to effortlessly make the return. In the event your entire order is cancelled by the seller or all items in your order are successfully disputed, the Make it Returnable fee will be refunded to you. However, the fee will not be refunded for partial cancellations or partial disputes.",
      ]),
      root.createComponent(
        TextBlock,
        { inlineAlignment: "center" },
        `Please note that shipping fees are not covered by Make it Returnable. The original shipping fee will not be returned and a ${formatMoney(
          returnShippingFee,
          currencyCode
        )} return shipping fee will be deducted from your final refund.`
      ),
      root.createComponent(
        TextBlock,
        { inlineAlignment: "center" },
        "* Your order may be ineligible for Make it Returnable if the order value exceeds our price cap or you are shipping to an address outside of the United States."
      ),
      root.createComponent(
        View,
        {
          background: "subdued",
          padding: "tight",
          border: "base",
          cornerRadius: "base",
        },
        [
          root.createComponent(
            TextBlock,
            { inlineAlignment: "center" },
            "Over 1,000 customers have purchased Make it Returnable for peace of mind in the last 30 days. Join them and shop worry-free."
          ),
        ]
      ),
      root.createComponent(View, { inlineAlignment: "center" }, [
        root.createComponent(
          Link,
          {
            to: "https://www.seel.com/customer-testimonials",
            appearance: "info",
          },
          "Learn more >"
        ),
      ]),
    ]),
  ]);
}

const createReturnToMerchantModal = (root, { returnConfig = {}, shopName }) => {
  const { returnWindow = "-", resolutionCenterLink = "https://www.seel.com" } =
    returnConfig;
  return createModal(root, undefined, [
    root.createComponent(
      BlockStack,
      { padding: ["none", "extraLoose"], spacing: "loose" },
      [
        root.createComponent(
          TextBlock,
          {},
          "Opting in Seel Make it Returnable at checkout allows you to return previously non-returnable items."
        ),
        root.createComponent(
          TextBlock,
          { emphasis: "bold" },
          "Please check out the Return Policy with Seel Make it Returnable below:"
        ),
        root.createComponent(List, { spacing: "tight" }, [
          root.createComponent(
            ListItem,
            undefined,
            `Make it Returnable is only available to US domestic orders.`
          ),
          root.createComponent(
            ListItem,
            undefined,
            `Items covered by Seel Make it Returnable can be returned for a full refund within ${returnWindow} days of receipt of shipment.`
          ),
          root.createComponent(
            ListItem,
            undefined,
            `The returned item(s) must be new, unworn, unwashed, in the same condition in which you received them, and in the original packaging with tags attached.`
          ),
          root.createComponent(ListItem, undefined, [
            root.createComponent(TextBlock, undefined, [
              "To initiate a return, please follow the instructions provided on ",
              root.createComponent(
                Link,
                { appearance: "info", to: resolutionCenterLink },
                [`${shopName}’s Return Policy page.`]
              ),
            ]),
          ]),
          root.createComponent(
            ListItem,
            undefined,
            `Unless your order is canceled, Seel Make it Returnable fee is not refundable.`
          ),
        ]),
        root.createComponent(
          TextBlock,
          {},
          "For more information, you can read our Terms of Service. If you have further questions, you can also contact returns@seel.com."
        ),
        root.createComponent(
          View,
          {
            background: "subdued",
            padding: "tight",
            border: "base",
            cornerRadius: "base",
          },
          [
            root.createComponent(
              TextBlock,
              { inlineAlignment: "center" },
              "Over 1,000 customers have purchased Make it Returnable for peace of mind in the last 30 days. Join them and shop worry-free."
            ),
          ]
        ),
        root.createComponent(View, { inlineAlignment: "center" }, [
          root.createComponent(
            Link,
            {
              to: "https://www.seel.com/customer-testimonials",
              appearance: "info",
            },
            "Learn more >"
          ),
        ]),
      ]
    ),
  ]);
};

export default (
  root,
  { name, widgetStatus, quote, merchantConfig, shopName = "" }
) => {
  const { returnWindow = "-", returnToSeel = true } =
    merchantConfig.returnConfig || {};
  const widget = root.createComponent(
    BlockLayout,
    {
      id: `${name}-widget`,
      rows: ["auto", "auto", "auto"],
      border: "base",
      cornerRadius: "base",
      padding: "base",
      spacing: "tight",
    },
    [
      root.createComponent(
        Grid,
        {
          columns: ["auto", "1fr"],
          rows: ["auto"],
          spacing: ["tight", "base"],
          blockAlignment: "center",
        },
        [
          root.createComponent(
            Checkbox,
            {
              id: `${name}-checkbox`,
              value: Boolean(widgetStatus),
              disabled: true,
            },
            ""
          ),
          root.createComponent(
            InlineStack,
            {
              spacing: "extraTight",
              padding: "none",
              blockAlignment: "center",
            },
            [
              root.createComponent(
                Heading,
                { level: "2" },
                "Make it Returnable™"
              ),
              root.createComponent(
                Pressable,
                {
                  overlay: returnToSeel
                    ? createReturnToSeelModal(root, {
                        name,
                        returnConfig: merchantConfig.returnConfig,
                        currencyCode: quote.currencyCode,
                      })
                    : createReturnToMerchantModal(root, {
                        returnConfig: merchantConfig.returnConfig,
                        shopName,
                      }),
                },
                root.createComponent(Icon, {
                  source: "critical",
                  appearance: "base",
                  size: "small",
                })
              ),
            ]
          ),
          root.createComponent(View),
          root.createComponent(
            Grid,
            {
              columns: ["1fr", "1fr"],
              blockAlignment: "center",
              spacing: ["tight", "none"],
            },
            [
              "Item doesn’t fit",
              "No longer needed",
              "Dissatisfied with items",
              "Arrived too late",
            ].map((c) =>
              root.createComponent(
                InlineStack,
                {
                  blockAlignment: "center",
                  spacing: "tight",
                },
                [
                  root.createComponent(Icon, {
                    source: "checkmark",
                    size: "extraSmall",
                    appearance: "subdued",
                  }),
                  root.createComponent(Text, { appearance: "subdued" }, c),
                ]
              )
            )
          ),
        ]
      ),
      root.createComponent(Divider),
      root.createComponent(
        TextBlock,
        {
          id: `${name}-description-text`,
          appearance: "subdued",
          size: "small",
        },
        createDescription(quote, returnWindow)
      ),
    ]
  );
  if (root.children.length) {
    root.appendChild(root.createComponent(BlockSpacer, { spacing: "tight" }));
  }
  root.appendChild(widget);
};
