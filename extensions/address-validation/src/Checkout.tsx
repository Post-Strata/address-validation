import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  useShippingAddress,
  useExtensionCapability,
  useBuyerJourneyIntercept,
} from "@shopify/ui-extensions-react/checkout";
import { useCallback, useEffect, useRef, useState } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.delivery-address.render-before", () => (
  <Extension />
));

function Extension() {
  const zipErrorRef = useRef(null);
  const translate = useTranslate();
  const instructions = useInstructions();
  const shippingAddress = useShippingAddress();

  const [addressValid, setAddressValid] = useState(true);
  const [validating, setValidating] = useState(false);

  // Set up intercept
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    console.log('useBuyerJourneyIntercept')
    console.log({canBlockProgress , addressValid})
    // Only block if we can and address is not validated
    if (canBlockProgress && !addressValid) {
      return {
        behavior: "block",
        reason: "Address validation required",
        perform: () => {
            // Scroll to your component or show validation UI
            console.log("Invalid address");
            setValidating(true);
        },
        errors: [{
          message:'BAD ZIPCODE FOOL',
          target: '$.cart.deliveryGroups[0].deliveryAddress.zip'
        }]
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        setValidating(false);
      }
    };
  });

  const validateAddress = useCallback(() => {
    console.log("validating address");
    const {countryCode, city, provinceCode, zip} = shippingAddress;
    console.log({shippingAddress, zip})

    const isUSA = countryCode === "US";

    const hasDash = zip.includes("-");

    // This application only validates US addresses
    if (!isUSA) {
      console.log("Not a US address");
      return;
    }

    if (!hasDash) {
      console.log("No dash in zip code");
      setAddressValid(false);
      return;
    }

    // Check if the address is valid and get the full zip code

    //


    console.log({shippingAddress})
    // const zipCode = shippingAddress?.postalCode;
    setAddressValid(true);
  },[shippingAddress, setAddressValid]);

  useEffect(() => {
    validateAddress();
  },[validateAddress])

  useEffect(() => {
    if (!addressValid && zipErrorRef.current) {
      zipErrorRef.current.scrollIntoView({ behavior: 'smooth' });
      zipErrorRef.current.focus();
    }
  }, [addressValid, zipErrorRef])


  // 2. Check instructions for feature availability, see https://shopify.dev/docs/api/checkout-ui-extensions/apis/cart-instructions for details
  if (!instructions.delivery.canSelectCustomAddress) {
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="address-validation" status="warning">
        {translate("customAddressChangesAreNotSupported")}
      </Banner>
    );
  }
  if (!instructions.attributes.canUpdateAttributes) {
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="address-validation" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  if (!addressValid) {
    return (<BlockStack border={"dotted"} padding={"tight"}>
      <Banner title="address-validation" status="critical">
          Hi
      </Banner>
    </BlockStack>
    );
  }

  return

}
