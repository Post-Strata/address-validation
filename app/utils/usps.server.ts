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
 * @param consumerKey Optional USPS API key (falls back to env variable)
 * @param consumerSecret Optional USPS API secret (falls back to env variable)
 * @returns Validation result with ZIP+4 if available
 */
export async function fetchUSPSZip4(
  address: AddressInput,
  consumerKey?: string,
  consumerSecret?: string
): Promise<StandardizedAddressResponse> {
  const USPS_CONSUMER_KEY = consumerKey;
  const USPS_CONSUMER_SECRET = consumerSecret;

  console.log('USPS credentials available:', !!USPS_CONSUMER_KEY, !!USPS_CONSUMER_SECRET);

  if (!USPS_CONSUMER_KEY || !USPS_CONSUMER_SECRET) {
    console.error("USPS API credentials not configured");
    return { valid: false, error: "USPS API not configured" };
  }

  const token = await getUSPSToken(USPS_CONSUMER_KEY, USPS_CONSUMER_SECRET)
  console.log('USPS token:', token);

  const validatedAddress = await validateUSPSAddress(address, token);
  console.log('Validated address:', validatedAddress);
  return validatedAddress;
}
