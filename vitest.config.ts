import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      // `.claude/worktrees/*` to kopie repo dla agentów — bez tego gołe
      // `pnpm test --run` zbiera testy ze STARYCH worktree'ów jako własne.
      exclude: ['**/.claude/**', '**/node_modules/**'],
    },
  }),
)
