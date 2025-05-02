# Address Validation Extension with USPS ZIP+4 Lookup

This Checkout UI extension validates US shipping addresses and enhances them with USPS ZIP+4 codes to improve delivery accuracy.

## Features

- Validates US addresses during checkout
- Retrieves the full 9-digit ZIP+4 code from USPS Address API 3.0
- Allows customers to choose whether to use the enhanced ZIP code
- Prevents checkout with invalid addresses
- Falls back gracefully when validation cannot be completed

## Setup

### Prerequisites

1. Create a [development store](https://shopify.dev/docs/apps/tools/development-stores) with the [checkout extensibility developer preview](https://shopify.dev/docs/api/release-notes/developer-previews#previewing-new-features)
2. Set up USPS Address API 3.0 credentials by registering at the [USPS Web Tools API Portal](https://www.usps.com/business/web-tools-apis/)

### Environment Variables

The extension requires the following environment variables to be set in your app:

```
USPS_CONSUMER_KEY=your_usps_api_key
USPS_CONSUMER_SECRET=your_usps_consumer_id
```

## Implementation Details

This extension uses:

- The `purchase.checkout.delivery-address.render-before` extension target to display validation UI before the address form
- Shopify's App Proxy to securely call the USPS Address API 3.0 from the backend
- React hooks for managing validation state and UI interactions

### API Endpoint

The extension communicates with a backend API endpoint at `/api/validateAddress` that:

1. Receives address data from the checkout
2. Calls the USPS Address API 3.0 with proper authentication
3. Returns validation results with the ZIP+4 code if available

## Extension Files

- `src/Checkout.tsx`: Main extension code that handles address validation and UI
- `locales/en.default.json`: English translations for UI messages
- `shopify.extension.toml`: Extension configuration

## Useful Links

- [USPS Address API 3.0 Documentation](https://www.usps.com/business/web-tools-apis/address-information-v3-1b.htm)
- [Checkout UI extension documentation](https://shopify.dev/api/checkout-extensions)
- [Checkout UI extension tutorials](https://shopify.dev/docs/apps/checkout)
  - [Adding field validation](https://shopify.dev/apps/checkout/validation)
  - [Localizing an extension](https://shopify.dev/apps/checkout/localize-ui-extensions)