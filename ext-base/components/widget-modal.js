import {
  Modal,
  Text,
  TextBlock,
  Image,
  View,
  BlockStack,
  InlineStack,
  BlockSpacer,
  BlockLayout,
} from "@shopify/ui-extensions/checkout";

function createCard(root, props) {
  const { title, type, icon, contents = [] } = props || {};
  return root.createComponent(BlockLayout, { rows: ["auto", "fill"], border: "base", cornerRadius: "base" }, [
    root.createComponent(
      View,
      { padding: "base", border: ["none", "none", "base", "none"] },
      root.createComponent(TextBlock, { emphasis: "bold", inlineAlignment: "center" }, title)
    ),
    type === "list"
      ? root.createComponent(
          View,
          {
            padding: "base",
            inlineAlignment: "center",
            blockAlignment: "center",
          },
          root.createComponent(
            BlockStack,
            { spacing: "extraTight" },
            contents.map((c) =>
              root.createComponent(
                InlineStack,
                { overflow: "hidden", spacing: "extraTight", blockAlignment: "center" },
                [
                  root.createComponent(Image, { source: icon }),
                  root.createComponent(Text, { appearance: "subdued" }, c),
                ]
              )
            )
          )
        )
      : root.createComponent(BlockStack, { inlineAlignment: "center", spacing: "tight", padding: "base" }, [
          root.createComponent(Image, { source: icon }),
          root.createComponent(
            BlockStack,
            { inlineAlignment: "center", spacing: "none" },
            contents.map((c) =>
              root.createComponent(TextBlock, { inlineAlignment: "center", appearance: "subdued" }, c)
            )
          ),
        ]),
  ]);
}

function createModal(root, props = {}, children = []) {
  const modalFragment = root.createFragment();
  const modal = root.createComponent(Modal, { id: props.id, padding: true }, [
    root.createComponent(BlockStack, undefined, [
      root.createComponent(
        View,
        undefined,
        root.createComponent(Image, {
          source: "https://cdn.seel.com/assets/images/logo__-012.svg",
        })
      ),
      root.createComponent(BlockSpacer, { spacing: "loose" }),
      ...children,
      root.createComponent(BlockSpacer, { spacing: "extraLoose" }),
    ]),
  ]);
  modalFragment.appendChild(modal);
  return modalFragment;
}

export { createCard, createModal };
