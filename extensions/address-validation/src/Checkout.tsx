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
  useSettings
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
  const { sessionToken } = useApi();
  const { api_host } = useSettings();

  console.log("🔄 API HOST:", api_host);

  const [addressValid, setAddressValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
    } catch (error) {
      console.error("❌ ERROR APPLYING ZIP+4:", error);
    }
  }, [applyShippingAddressChange]);

  const validateAddress = useCallback(async () => {
    console.log("🔍 VALIDATING ADDRESS");
    const { countryCode, city, zip, address1, address2, provinceCode } = shippingAddress;

    const token = await sessionToken.get();

    const isUSA = countryCode === "US";

    // This application only validates US addresses
    if (!isUSA) {
      console.log("🌎 NOT A US ADDRESS - SKIPPING VALIDATION");
      return;
    }

    // Check for either a basic 5-digit ZIP or any ZIP code format with 5 digits before a hyphen
    const zipFormatRegex = /^(\d{5})(?:-\d{1,4})?$/;

    if (!zipFormatRegex.test(zip)) {
      console.log("❌ INVALID ZIP FORMAT:", zip);
      setErrorMessage("Please enter a valid ZIP code (5 digits or ZIP+4 format)");
      setAddressValid(false);
      return;
    }

    // Extract the 5-digit ZIP code (regardless of whether it has a hyphen or not)
    const zipDigits = zip.substring(0, 5);
    console.log("✅ USING 5-DIGIT ZIP:", zipDigits);

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
      // Use the API host from extension settings
      const host = api_host || 'https://zip.shopify.poststrata.com';
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
            zip: zipDigits, // Use the extracted 5-digit ZIP
            country: countryCode,
          }
        }),
      });

      const data = await response.json();

      if (data.error && data.error.includes("configured")) {
        throw new Error(data.error);
      }

      if (data.error) {
        console.error("❌ ADDRESS VALIDATION ERROR:", data.error);
        setErrorMessage(data.error);
        setAddressValid(false);
        return;
      }

      // Check if the address is valid and has a ZIP+4 code
      if (data.valid && data.address && data.address.zipPlus4) {
        console.log("✅ VALIDATED ZIP+4:", data.address.zipPlus4);

        // Create the full ZIP+4 code
        const fullZip = `${data.address.zipCode}-${data.address.zipPlus4}`;
        console.log("📬 SUGGESTED FULL ZIP:", fullZip);

        // Apply the full ZIP+4 code
        await applyFullZip(fullZip);
        setAddressValid(true);
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
  },[shippingAddress, sessionToken, api_host, USPS_CONSUMER_KEY, USPS_CONSUMER_SECRET, applyFullZip]);

  // Set up intercept
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    console.log('🟢 INTERCEPT EVENT FIRED');

    // Only block if we can and address is not validated
    if (canBlockProgress && (!addressValid)) {
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
