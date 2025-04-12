/**
 * Response interface for USPS OAuth token
 */
interface USPSTokenResponse {
  access_token: string;
  token_type: string;
  issued_at: string;
  expires_in: string;
  status: string;
  scope: string;
  issuer: string;
  client_id: string;
  application_name: string;
  api_products: string;
  public_key: string;
}

/**
 * Interface for address input
 */
interface AddressInput {
  streetAddress: string;
  secondaryAddress?: string; // Apartment, suite, etc. (optional)
  city: string;
  state: string;
  zipCode?: string; // Optional, but recommended if available
}

/**
 * Interface for standardized address response
 */
interface StandardizedAddressResponse {
  valid: boolean;
  address?: {
    streetAddress: string;
    secondaryAddress: string | null;
    city: string;
    state: string;
    zipCode: string;
    zipPlus4: string;
  };
  addressAdditionalInfo?: {
    deliveryPoint: string;
    carrierRoute: string;
    DPVConfirmation: string;
    DPVCMRA: string;
    business: string;
    centralDeliveryPoint: string;
    vacant: string;
  };
  error?: string;
}

/**
 * Validates an address using the USPS API
 * @param address - The address to validate
 * @param token - The USPS API access token
 * @returns A promise that resolves to the address validation result
 */
export async function validateUSPSAddress(
  address: AddressInput,
  token: string
): Promise<StandardizedAddressResponse> {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('streetAddress', address.streetAddress);

    if (address.secondaryAddress) {
      queryParams.append('secondaryAddress', address.secondaryAddress);
    }

    queryParams.append('city', address.city);
    queryParams.append('state', address.state);

    if (address.zipCode) {
      queryParams.append('ZIPCode', address.zipCode);
    }

    // Make request to USPS API
    const response = await fetch(
      `https://apis.usps.com/addresses/v3/address?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json();
      return {
        valid: false,
        error: errorData.message || `Error: ${response.status} ${response.statusText}`
      };
    }

    // Parse response
    const data = await response.json();

    // Check if address is valid (based on presence of ZIP+4)
    const isValid = !!(data.address && data.address.ZIPCode && data.address.ZIPPlus4);

    return {
      valid: isValid,
      address: isValid ? {
        streetAddress: data.address.streetAddress,
        secondaryAddress: data.address.secondaryAddress,
        city: data.address.city,
        state: data.address.state,
        zipCode: data.address.ZIPCode,
        zipPlus4: data.address.ZIPPlus4
      } : undefined,
      addressAdditionalInfo: data.addressAdditionalInfo,
      error: isValid ? undefined : 'Address could not be validated'
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Authenticates with the USPS API v3 and returns an access token
 * @param clientId - Your USPS API client ID
 * @param clientSecret - Your USPS API client secret
 * @returns A promise that resolves to the access token string
 * @throws Error if authentication fails
 */
export async function getUSPSToken(clientId: string, clientSecret: string): Promise<string> {
  try {
    // Define the request URL
    const tokenUrl = 'https://apis.usps.com/oauth2/v3/token';

    // Define the request payload
    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    };

    // Make the POST request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`USPS API authentication failed: ${response.status} ${errorText}`);
    }

    console.log('USPS token response status:', response);

    // Parse the JSON response
    const data = await response.json() as USPSTokenResponse;

    // Extract and return the access token
    return data.access_token;
  } catch (error) {
    console.error('Error getting USPS token:', error);
    throw error;
  }
}

/**
 * Fetches ZIP+4 information from the USPS Address API 3.0
 * @param address Address information to validate
 * @returns Validation result with ZIP+4 if available
 */
export async function fetchUSPSZip4(address: AddressInput): Promise<StandardizedAddressResponse> {
  const { USPS_CONSUMER_KEY, USPS_CONSUMER_SECRET } = process.env;
  console.log('USPS credentials available:', !!USPS_CONSUMER_KEY, !!USPS_CONSUMER_SECRET);

  if (!USPS_CONSUMER_KEY || !USPS_CONSUMER_SECRET) {
    console.error("USPS API credentials not configured");
    return { validated: false, error: "USPS API not configured" };
  }

  const token = await getUSPSToken(USPS_CONSUMER_KEY, USPS_CONSUMER_SECRET)
  console.log('USPS token:', token);

  const validatedAddress = await validateUSPSAddress(address, token);
  console.log('Validated address:', validatedAddress);
  return validatedAddress;

  // try {
  //   // Create the request payload for Address API 3.0
  //   const requestPayload = {
  //     "addressLine1": address.address1,
  //     "addressLine2": address.address2 || "",
  //     "city": address.city,
  //     "state": address.state,
  //     "zip": address.zip5,
  //     "returnHighestPrecisionLevel": true,
  //     "returnCarrierRoute": true
  //   };

  //   // Try a different endpoint or completely different authentication pattern
  //   // USPS might be using a different API pattern than standard OAuth2

  //   // Approach 1: Direct API Key + Basic Auth
  //   try {
  //     console.log('Trying approach with API Key Headers + Basic Auth');

  //     // Convert credentials to base64 for basic auth
  //     const basicAuth = Buffer.from(`${USPS_CONSUMER_KEY}:${USPS_CONSUMER_SECRET}`).toString('base64');

  //     const response = await fetch(
  //       'https://api.usps.com/addresses/v3/address',
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Accept': 'application/json',
  //           'Authorization': `Basic ${basicAuth}`,
  //           'X-API-Key': USPS_CONSUMER_KEY,
  //           'X-Consumer-Id': USPS_CONSUMER_SECRET
  //         },
  //         body: JSON.stringify(requestPayload)
  //       }
  //     );

  //     console.log('Approach 1 status:', response.status);

  //     if (response.ok) {
  //       const result = await response.json();
  //       console.log('Approach 1 response:', JSON.stringify(result, null, 2));

  //       return processUSPSResponse(result);
  //     } else {
  //       console.log('Approach 1 failed with status:', response.status);
  //       let errorText = '';
  //       try {
  //         errorText = await response.text();
  //         console.log('Error details:', errorText);
  //       } catch (e) {
  //         console.error('Failed to read error response:', e);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Approach 1 error:', error);
  //   }

  //   // Approach 2: Try authentication in URL params (some older APIs use this)
  //   try {
  //     console.log('Trying approach with URL parameters');

  //     const url = new URL('https://api.usps.com/addresses/v3/address');
  //     url.searchParams.append('client_id', USPS_CONSUMER_KEY);
  //     url.searchParams.append('client_secret', USPS_CONSUMER_SECRET);

  //     const response = await fetch(
  //       url.toString(),
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Accept': 'application/json'
  //         },
  //         body: JSON.stringify(requestPayload)
  //       }
  //     );

  //     console.log('Approach 2 status:', response.status);

  //     if (response.ok) {
  //       const result = await response.json();
  //       console.log('Approach 2 response:', JSON.stringify(result, null, 2));

  //       return processUSPSResponse(result);
  //     } else {
  //       console.log('Approach 2 failed with status:', response.status);
  //       let errorText = '';
  //       try {
  //         errorText = await response.text();
  //         console.log('Error details:', errorText);
  //       } catch (e) {
  //         console.error('Failed to read error response:', e);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Approach 2 error:', error);
  //   }

  //   // Approach 3: Try with a traditional USPS Username/Password in headers
  //   // (based on older USPS Web Tools API)
  //   try {
  //     console.log('Trying approach with traditional USPS Web Tools style');

  //     const response = await fetch(
  //       'https://api.usps.com/addresses/v3/address',
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Accept': 'application/json',
  //           'Username': USPS_CONSUMER_KEY,
  //           'Password': USPS_CONSUMER_SECRET
  //         },
  //         body: JSON.stringify(requestPayload)
  //       }
  //     );

  //     console.log('Approach 3 status:', response.status);

  //     if (response.ok) {
  //       const result = await response.json();
  //       console.log('Approach 3 response:', JSON.stringify(result, null, 2));

  //       return processUSPSResponse(result);
  //     } else {
  //       console.log('Approach 3 failed with status:', response.status);
  //       let errorText = '';
  //       try {
  //         errorText = await response.text();
  //         console.log('Error details:', errorText);
  //       } catch (e) {
  //         console.error('Failed to read error response:', e);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Approach 3 error:', error);
  //   }

  //   // If all approaches fail, return a graceful error
  //   return {
  //     validated: false,
  //     error: "Could not authenticate with USPS API after multiple attempts"
  //   };

  // } catch (error) {
  //   console.error('Error calling USPS API:', error);
  //   return {
  //     validated: false,
  //     error: error instanceof Error ? error.message : 'Unknown error'
  //   };
  // }
}

/**
 * Process USPS API response
 */
// function processUSPSResponse(result: any): USPSResponse {
//   console.log('Processing USPS API response');

//   // Handle successful response from Address API 3.0
//   if (result.resultStatus === "SUCCESS" && result.addressList && result.addressList.length > 0) {
//     const validatedAddress = result.addressList[0];

//     // Check if address was found and has a ZIP+4
//     if (validatedAddress.zip4) {
//       return {
//         validated: true,
//         zip4: validatedAddress.zip4
//       };
//     }

//     // Address found but no ZIP+4
//     return {
//       validated: true,
//       error: 'No ZIP+4 found for this address'
//     };
//   }

//   // Handle error responses - check both formats based on USPS API 3.0 docs
//   if (result.errors && result.errors.length > 0) {
//     return {
//       validated: false,
//       error: result.errors[0].message || 'USPS validation error'
//     };
//   }

//   if (result.error) {
//     return {
//       validated: false,
//       error: result.error.description || 'USPS validation error'
//     };
//   }

//   // Unexpected response format
//   return {
//     validated: false,
//     error: 'Invalid response from USPS'
//   };
// }
