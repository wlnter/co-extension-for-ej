import { extension } from "@shopify/ui-extensions/checkout";
import { initialization } from "../../../ext-base/index.js";
import { insuranceType } from "../../../ext-base/constant.js";
import renderSpWidget, {
  createDescription as createSpDescription,
  onChangeHandler as onSpChange,
} from "../../../ext-base/components/delivery-guarantee.js";
import renderRaWidget, {
  createDescription as createRaDescription,
  onChangeHandler as onRaChange,
} from "../../../ext-base/components/return-assurance.js";
import { proxy } from "valtio/vanilla";

// For unhandled promise rejections
self.addEventListener("unhandledrejection", (error) => {
  console.log(`event unhandledrejection`, error);
});
// For other exceptions
self.addEventListener("error", (error) => {
  console.log(`event error`, error);
});

const { SP, RA } = insuranceType;
const extensionPoint = "purchase.checkout.block.render";

export default extension(extensionPoint, (root, api) => {
  // initialization(
  //   root,
  //   api,
  //   /**
  //    * insurance info
  //    */
  //   proxy({
  //     name: 'delivery-guarantee',
  //     type: SP,
  //     phase: undefined,
  //     set next(val) {
  //       this.phase = this.phase << 1;
  //     },
  //   }),
  //   /**
  //    * render option
  //    */
  //   {
  //     renderWidget: renderSpWidget,
  //     createDescription: createSpDescription,
  //     onChangeHandler: onSpChange,
  //   }
  // );

  // ====

  initialization(
    root,
    api,
    proxy({
      name: "return-assurance",
      type: RA,
      phase: undefined,
      set next(val) {
        this.phase = this.phase << 1;
      },
    }),
    {
      renderWidget: renderRaWidget,
      createDescription: createRaDescription,
      onChangeHandler: onRaChange,
    }
  );
});
