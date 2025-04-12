import {
  reactExtension,
  Banner,
  BlockStack,
  useInstructions,
  useTranslate,
  useShippingAddress,
  useBuyerJourneyIntercept,
  useApi,
  useApplyShippingAddressChange,
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
  const applyShippingAddressChange = useApplyShippingAddressChange();
  const { sessionToken, shop } = useApi();

  const [addressValid, setAddressValid] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  // Set up intercept
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    console.log('🟢 INTERCEPT EVENT FIRED');
    console.log({canBlockProgress, addressValid, errorMessage});
    console.log('Current shipping address:', shippingAddress);

    // Only block if we can and address is not validated
    if (canBlockProgress && !addressValid) {
      console.log('🛑 BLOCKING CHECKOUT: Address validation required');
      return {
        behavior: "block",
        reason: "Address validation required",
        perform: () => {
            // Scroll to your component or show validation UI
            console.log("🛑 PERFORMING BLOCK ACTION: Focusing validation UI");
        },
        errors: [{
          message: errorMessage || 'Please validate your address for a complete ZIP+4 code',
          target: '$.cart.deliveryGroups[0].deliveryAddress.zip'
        }]
      };
    }

    console.log('✅ ALLOWING CHECKOUT: Address is valid or validation not required');
    return {
      behavior: "allow",
      perform: () => {
        console.log('✅ PERFORMING ALLOW ACTION: Clearing validation state');
      }
    };
  });

  // Function to apply the full ZIP+4 code
  const applyFullZip = useCallback(async (zipCode) => {
    console.log("🔄 APPLYING FULL ZIP:", zipCode);
    try {
      await applyShippingAddressChange({
        type: 'updateShippingAddress',
        address: {
          zip: zipCode,
        }
      });
      console.log("✅ FULL ZIP APPLIED");
      setAddressValid(true);
    } catch (error) {
      console.error("❌ ERROR APPLYING ZIP+4:", error);
    }
  }, [applyShippingAddressChange]);

  const validateAddress = useCallback(async () => {
    console.log("🔍 VALIDATING ADDRESS");
    const { countryCode, city, zip, address1, address2, provinceCode } = shippingAddress;
    console.log('📋 ADDRESS DATA:', {address1, address2, city, provinceCode, zip, countryCode});
    const token = await sessionToken.get();
    console.log('sessionToken.get()', token);

    const isUSA = countryCode === "US";

    // This application only validates US addresses
    if (!isUSA) {
      console.log("🌎 NOT A US ADDRESS - SKIPPING VALIDATION");
      return;
    }

    // Check if we already have a ZIP+4 format
    // Here we rely on Shopify to validate the zipcode
    const zipRegex = /^\d{5}-\d{4}$/;
    if (zipRegex.test(zip)) {
      console.log("✅ ZIP+4 ALREADY VALID:", zip);
      setAddressValid(true);
      return;
    }

    // Basic 5-digit ZIP validation
    const basicZipRegex = /^\d{5}$/;
    if (!basicZipRegex.test(zip)) {
      console.log("❌ INVALID BASIC ZIP FORMAT:", zip);
      setErrorMessage("Please enter a valid 5-digit ZIP code");
      setAddressValid(false);
      return;
    }

    // Ensure we have the minimum required fields for validation
    if (!city || !provinceCode || !address1) {
      console.log("❌ MISSING REQUIRED ADDRESS FIELDS");
      console.log({city, provinceCode, address1});
      setErrorMessage("Please complete all address fields");
      setAddressValid(false);
      return;
    }

    try {
      console.log("🔄 SENDING API REQUEST TO VALIDATE ADDRESS");
      // Use your Remix app's URL directly
      // This must match your app's actual URL in shopify.app.toml
      // TODO: Use environment variable for this
      // const host = process.env.VITE_API_HOST;
      const host = 'https://velocity-new-cabinet-face.trycloudflare.com';

      console.log("🔄 API storefrontUrl:", shop.myshopifyDomain);
      console.log("📡 API HOST:", host);

      // Try to validate the user's address
      console.log("🔄 Now validating actual address...");
      const response = await fetch(`${host}/api/validate-address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({
          address: {
            address1,
            address2,
            city,
            province: provinceCode,
            zip,
            country: countryCode,
          }
        }),
      });

      console.log("📊 API RESPONSE STATUS:", response.status);
      const data = await response.json();
      console.log("📊 API RESPONSE DATA:", data);

      if (data.error) {
        console.error("❌ ADDRESS VALIDATION ERROR:", data.error);
        setErrorMessage(data.error);
        setAddressValid(false);
        return;
      }
      const { valid, address } = data;
      const { zipCode, zipPlus4 } = address;
      console.log("📬 VALIDATION RESULT:", { valid, zipCode, zipPlus4 });

      if (valid && zipPlus4) {
        console.log("✅ VALIDATED ZIP+4:", zipPlus4);
        const fullZip = `${zipCode}-${zipPlus4}`;
        console.log("📬 SUGGESTED FULL ZIP:", fullZip);
        applyFullZip(fullZip)
      } else {
        // If we couldn't validate with USPS, still allow checkout
        console.log("⚠️ COULD NOT VALIDATE WITH USPS - ALLOWING CHECKOUT ANYWAY");
        setAddressValid(true);
      }
    } catch (error) {
      console.error("❌ USPS VALIDATION ERROR:", error);
      // Allow checkout even if validation fails
      console.log("⚠️ ERROR DURING VALIDATION - ALLOWING CHECKOUT ANYWAY");
      setAddressValid(true);
    }
  },[shippingAddress, sessionToken, shop.myshopifyDomain, applyFullZip]);

  useEffect(() => {
    console.log("🔄 EFFECT: ADDRESS CHANGED - VALIDATING");
    validateAddress();
  },[validateAddress])

  useEffect(() => {
    if (!addressValid && zipErrorRef.current) {
      console.log("🔄 EFFECT: ADDRESS INVALID - SCROLLING TO ERROR");
      zipErrorRef.current.scrollIntoView({ behavior: 'smooth' });
      zipErrorRef.current.focus();
    }
  }, [addressValid, zipErrorRef])


  // 2. Check instructions for feature availability, see https://shopify.dev/docs/api/checkout-ui-extensions/apis/cart-instructions for details
  if (!instructions.delivery.canSelectCustomAddress) {
    console.log("⚠️ CUSTOM ADDRESS CHANGES NOT SUPPORTED");
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="address-validation" status="warning">
        {translate("customAddressChangesAreNotSupported")}
      </Banner>
    );
  }

  if (!instructions.attributes.canUpdateAttributes) {
    console.log("⚠️ ATTRIBUTE CHANGES NOT SUPPORTED");
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="address-validation" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  if (!addressValid) {
    console.log("🔄 RENDERING ERROR UI - ADDRESS INVALID");
    console.log(`Error message: ${errorMessage || translate("invalidZipCode")}`);

    return (
      <BlockStack border={"dotted"} padding={"tight"} ref={zipErrorRef}>
        <Banner title={translate("addressValidation")} status="critical">
          {errorMessage || translate("invalidZipCode")}
        </Banner>
      </BlockStack>
    );
  }

  // Return empty component if address is valid
  console.log("✅ ADDRESS VALID - RENDERING NOTHING");
  return null
}
