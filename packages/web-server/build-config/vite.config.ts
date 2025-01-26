import path from 'node:path'
import type { UserConfig } from 'vite'
import { builtinModules } from 'node:module'
import { spawn } from 'node:child_process'

export { buildConfig as buildPreloadConfig } from './vite.config.web'

const isProd = process.env.NODE_ENV == 'production'
const rootPath = path.join(__dirname, '../../../')
const projectPath = path.join(rootPath, 'packages/web-server')

export const runServer = (onLog: (data: Buffer, color: 'red' | 'blue') => void) => {
  let args = [path.join(projectPath, 'index.cjs')]

  // detect yarn or npm and process commandline args accordingly
  if (process.env.npm_execpath?.endsWith('yarn.js')) {
    args = args.concat(process.argv.slice(3))
  } else if (process.env.npm_execpath?.endsWith('npm-cli.js')) {
    args = args.concat(process.argv.slice(2))
  } else if (process.env.npm_execpath?.endsWith('pnpm.cjs')) {
    args = args.concat(process.argv.slice(2))
  }

  const webProcess = spawn('node', args, {
    cwd: projectPath,
    env: {
      NODE_OPTIONS: '--enable-source-maps',
    },
  })

  webProcess.stdout.on('data', (data: Buffer) => {
    onLog(data, 'blue')
  })
  webProcess.stderr.on('data', (data: Buffer) => {
    onLog(data, 'red')
  })

  webProcess.on('close', () => {
    process.exit()
  })

  return webProcess
}

export const buildConfig = (mode: string): UserConfig => {
  return {
    mode,
    root: projectPath,
    base: './',
    publicDir: false,
    logLevel: 'warn',
    resolve: {
      alias: {
        '@': path.join(projectPath, 'src'),
      },
      conditions: ['module', 'node', 'default', 'development|production'],
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
    build: {
      target: 'node16',
      // lib: {
      //   entry: 'src/index.ts',
      //   formats: ['cjs'],
      //   fileName: 'main',
      // },
      outDir: isProd ? path.join(rootPath, 'build/server') : path.join(projectPath, 'server'),
      emptyOutDir: false,
      reportCompressedSize: false,
      modulePreload: false,
      // assetsDir: 'chunks',
      sourcemap: !isProd,
      minify: false,
      watch: isProd
        ? null
        : {
            buildDelay: 500,
          },
      commonjsOptions: {
        // dynamicRequireTargets: ['*.js'],
        ignoreDynamicRequires: true,
      },
      rollupOptions: {
        external: [
          // /node_modules/,
          // 'better-sqlite3',
          ...builtinModules.flatMap((m) => [m, `node:${m}`]),
        ],
        input: {
          index: path.join(projectPath, 'src/index.ts'),
          'db-service.worker': path.join(rootPath, 'packages/shared/app/modules/worker/dbService/index.ts'),
          'util-service.worker': path.join(rootPath, 'packages/shared/app/modules/worker/utilService/index.ts'),
          'extension-service.worker': path.join(rootPath, 'packages/shared/app/modules/worker/extensionService/index.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          format: 'cjs',
          // manualChunks(id, info) {
          // //   return 'main'
          // },
          experimentalMinChunkSize: 50_000,
        },
        logLevel: 'warn',
      },
    },
    define: {
      'process.env.NODE_ENV': `"${process.env.NODE_ENV!}"`,
      // __QRC_DECODE_NODE_PATH__: `"${(isProd ? '../../build/Release' : path.join(rootPath, 'build/Release')).replace(/\\/g, '\\\\')}"`,
    },
    // cacheDir: path.join(rootPath, 'node_modules/.vite/main'),
  }
}
