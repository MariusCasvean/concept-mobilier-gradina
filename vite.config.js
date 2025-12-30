import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import fs from 'node:fs'
import path from 'node:path'

function computeBase() {
  // If a custom domain is used (CNAME present), assets should be rooted at '/'
  const cnamePath = path.resolve(process.cwd(), 'CNAME')
  if (fs.existsSync(cnamePath)) {
    const cname = fs.readFileSync(cnamePath, 'utf8').trim()
    if (cname.length > 0) return '/'
  }

  // Otherwise, GitHub Pages project sites are served from '/<repo>/'
  if (process.env.GITHUB_ACTIONS === 'true') {
    const repo = process.env.GITHUB_REPOSITORY || ''
    const repoName = repo.split('/')[1]
    if (repoName) return `/${repoName}/`
  }

  return '/'
}

export default defineConfig({
  base: computeBase(),
  plugins: [vue()],
})
