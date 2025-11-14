import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
  if (!SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required')
  }

  const projectRef = 'bylxzpvyzvycrpkwxvle'
  const command = 'npx'
  const args = ['-y', '@supabase/mcp-server-supabase@latest', `--project-ref=${projectRef}`]

  const transport = new StdioClientTransport({
    command,
    args,
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN,
    },
  })

  const client = new Client({
    name: 'skyluxse-codex-deployer',
    version: '0.1.0',
  })

  await client.connect(transport)

  const root = resolve(__dirname, '..')
  const indexPath = resolve(root, 'supabase/functions/kommo-status-webhook/index.ts')
  const functionConfigPath = resolve(root, 'supabase/functions/kommo-status-webhook/supabase.toml')
  const rootConfigPath = resolve(root, 'supabase/config.toml')

  const files = [
    { name: 'supabase/functions/kommo-status-webhook/index.ts', content: await readFile(indexPath, 'utf8') },
    { name: 'supabase/functions/kommo-status-webhook/supabase.toml', content: await readFile(functionConfigPath, 'utf8') },
    { name: 'supabase/config.toml', content: await readFile(rootConfigPath, 'utf8') },
  ]

  const result = await client.callTool({
    name: 'deploy_edge_function',
    arguments: {
      name: 'kommo-status-webhook',
      entrypoint_path: 'supabase/functions/kommo-status-webhook/index.ts',
      files,
    },
  })

  console.log(JSON.stringify(result, null, 2))

  await transport.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
