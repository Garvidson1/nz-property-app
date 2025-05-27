// This file will be deployed as a Vercel Serverless Function (API Route)
export default function handler(req, res) {
  // Ensure the request method is GET (or adjust if you prefer POST)
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Access the environment variable set in Vercel
  // Replace 'VITE_Maps_API_KEY' with the exact name of your environment variable
  const googleMapsApiKey = process.env.MAPS_API_KEY; // Or whatever you named it

  if (!googleMapsApiKey) {
    console.error("Google Maps API Key not set in Vercel environment variables.");
    return res.status(500).json({ error: 'Google Maps API key not configured.' });
  }

  // Respond with the API key
  res.status(200).json({ apiKey: googleMapsApiKey });
}
