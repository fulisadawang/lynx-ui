// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Dependency-free model verification, not a replacement for Vitest or native tests.
const source = new URL('../../packages/lynx-ui/src/image-preview/', import.meta.url)
const temporary = mkdtempSync(join(tmpdir(), 'lynx-ui-image-preview-'))
try {
  for (const name of ['model', 'model.test']) {
    let text = readFileSync(new URL(`${name}.ts`, source), 'utf8')
    if (name === 'model.test') {
      text = text.replace("from 'vitest'", "from 'node:test'")
        .replace("from './model'", "from './model.mjs'")
    }
    writeFileSync(join(temporary, `${name}.mjs`), stripTypeScriptTypes(text))
  }
  const result = spawnSync(process.execPath, ['--test', join(temporary, 'model.test.mjs')], { stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
