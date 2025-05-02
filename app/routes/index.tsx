import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "USPS Address Validation" },
    { name: "description", content: "USPS Address Validation API" },
  ];
};

export default function Index() {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      margin: 0,
      backgroundColor: "#f5f5f5",
      color: "#333"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        maxWidth: "600px"
      }}>
        <h1 style={{ color: "#008060", marginBottom: "1rem" }}>Hello World!</h1>
        <p style={{ lineHeight: 1.6, marginBottom: "1.5rem" }}>USPS Address Validation API is running.</p>
      </div>
    </div>
  );
}