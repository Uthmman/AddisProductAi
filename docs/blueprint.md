# **App Name**: Addis Product AI

## Core Features:

- Dashboard: Display a paginated table of products fetched from the WooCommerce API, showing Name, Price (in ETB), Stock Status, and a link to the Edit Page. Includes a button to create a new product.
- Product Editor/Creator: A form to create or edit product details including image upload, name, material, price, keywords, and Amharic name.
- AI Optimization: AI-powered generation of product name, description, short description, meta data, and tags in English, incorporating Amharic keywords for local SEO. Requires a 'tool' to make reasoning driven decisions on incorporating different elements.
- WooCommerce API Integration: Secure server-side fetching of paginated product lists, single product data, and updating products via the WooCommerce REST API with authentication.
- Image Handling: Two-step image upload process: first, store the image in Firebase Cloud Storage temporarily and then send the image to the WordPress Media Endpoint to get the required Media ID. This is required by the prompt and WooCommerce REST API.
- AI Orchestration Route: Secure API route to receive product data, handle image uploads, call the Gemini API with an Amharic-focused prompt, and return the AI-generated JSON for preview.

## Style Guidelines:

- Primary color: Warm gold (#FFC107), reminiscent of Ethiopian culture.
- Background color: Off-white (#F5F5DC), providing a neutral backdrop.
- Accent color: Deep red-brown (#8B4513), analogous to gold with less brightness, for highlights and calls to action.
- Headline font: 'Playfair' (serif) for an elegant, high-end feel; body font: 'PT Sans' (sans-serif) for readability.
- Clean, modern icons that reflect the functionality of the tool.
- Clean, organized layout optimized for product management, with clear sections for input fields and AI-generated previews.
- Subtle animations and transitions to enhance user experience, particularly when AI-generated content is updated.