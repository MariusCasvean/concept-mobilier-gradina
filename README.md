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

## GitHub Pages Deployment

This site is configured to deploy automatically to GitHub Pages with a custom domain.

### Automatic Deployment
- Pushes to the `main` branch trigger automatic deployment via GitHub Actions
- The workflow builds the site and deploys it to GitHub Pages
- The CNAME file in the `public/` directory ensures the custom domain is preserved

### DNS Configuration for Custom Domain

To verify ownership of the custom domain `concept-mobila-gradina.com`, you need to add DNS records with your domain registrar:

1. **Add A records** pointing to GitHub Pages IP addresses:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

2. **Add a TXT record** for domain verification:
   - Go to your domain registrar's DNS settings
   - GitHub will provide the exact TXT record name and value in: Settings → Pages → Custom domain
   - Add a TXT record with the name and value provided by GitHub
   - This helps GitHub verify you own the domain

3. **Add CNAME record** (optional, for www subdomain):
   - Name: `www`
   - Value: `mariuscasvean.github.io`
   - This redirects www.concept-mobila-gradina.com to your site

### GitHub Pages Setup

In your GitHub repository:
1. Go to Settings → Pages
2. Source: Select "GitHub Actions"
3. Custom domain: Enter `concept-mobila-gradina.com`
4. Wait for DNS check (can take up to 24 hours)
5. Enable "Enforce HTTPS" after DNS is verified

**Note**: DNS changes can take up to 24-48 hours to propagate. The TXT record is required for GitHub to verify domain ownership.

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