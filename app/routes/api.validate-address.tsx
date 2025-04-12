import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchUSPSZip4 } from "../utils/usps.server";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, use specific origin
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Handle OPTIONS preflight requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Only handle OPTIONS requests in the loader
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // For any other method that somehow ends up in the loader
  return new Response("Method not allowed", { status: 405 });
};

export async function action({ request }: ActionFunctionArgs) {

  // Verify HTTP method
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Regular validation flow
  // Clone the request before reading it multiple times
  const requestClone = request.clone();
  try {
    console.log('Request Body:', await requestClone.text());
  } catch (error) {
    console.log('Error reading request body as text');
  }

  try {
    console.log('Request JSON:', await request.clone().json());
  } catch (error) {
    console.log('Error reading request body as JSON');
  }

  console.log('Request Headers:', request.headers.get("Content-Type"));
  console.log('Request Headers:', request.headers.get("Accept"));

  try {
    // Authenticate the request using the session token
    await authenticate.public.checkout(request);
    // If authenticate doesn't throw an error, the token is valid
  } catch (error) {
    console.error("Authentication error:", error);
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders } }
    );
  }

  try {
    // Use a new clone of the request for the JSON parsing
    const requestData = await request.clone().json();
    const { address } = requestData;

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders } }
      );
    }

    // Validate required fields
    const requiredFields = ["address1", "city", "province", "zip", "country"];
    for (const field of requiredFields) {
      if (!address[field]) {
        return new Response(
          JSON.stringify({ error: `${field} is required` }),
          { status: 400, headers: { ...corsHeaders } }
        );
      }
    }

    // Only validate US addresses
    if (address.country !== "US") {
      return new Response(
        JSON.stringify({ error: "Only US addresses are supported" }),
        { status: 400, headers: { ...corsHeaders } }
      );
    }

    // Call USPS API to get ZIP+4 code
    const result = await fetchUSPSZip4({
      streetAddress: address.address1,
      secondaryAddress: address.address2 || "",
      city: address.city,
      state: address.province,
      zipCode: address.zip.substring(0, 5),
    });
    console.log("USPS API result:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error validating address:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders } }
    );
  }
}
