# Concept Mobilier Grădină — Vue 3 + Vite starter

A small site scaffold with Vue 3, Vite, Vue Router, and Pinia. No TypeScript.

## Features
- Top navigation: Home, Products, News, Discounts, Contact
- Each page has a simple component structure and modern styling
- Sticky glassy header and modern footer
- Pinia store example and route-based titles

## Quick start (Windows PowerShell)

```powershell
# Install deps
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

Open the dev URL printed in the terminal (typically http://localhost:5173).

## Structure
- `src/App.vue` — layout shell with header, main, footer
- `src/router` — routes for pages
- `src/pages` — page components
- `src/components` — UI and layout components
- `src/stores` — Pinia store example
- `src/assets/main.css` — global styles

## Notes
- Images use Unsplash demo URLs; replace with your assets later.
- This starter avoids TypeScript per request; you can add it later if needed.

## Firebase Realtime Database (index for discounts)

If you query discounted products using `orderByChild('showProductDiscount')` + `equalTo(true)`, RTDB requires an index.
In the Firebase Console → Realtime Database → Rules, add this under your existing `products` rule (keep your current `.read` / `.write` rules as-is):

```json
{
	"rules": {
		"products": {
			".indexOn": ["showProductDiscount"]
		}
	}
}
```