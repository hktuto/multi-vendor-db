import { defineNuxtModule, useLogger } from 'nuxt/kit'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Nuxt module to copy PostgreSQL migrations to public directory
 * This makes them available for PGlite client-side migrations
 */
export default defineNuxtModule({
  meta: {
    name: 'pglite-migrations',
    configKey: 'pgliteMigrations',
  },
  setup(_options, nuxt) {
    const logger = useLogger('pglite-migrations')
    
    const sourceDir = join(nuxt.options.rootDir, 'server/db/migrations/postgresql')
    const targetDir = join(nuxt.options.rootDir, 'public/.data/db/migrations/postgresql')
    
    nuxt.hooks.hook('build:before', async () => {
      logger.info('Copying PostgreSQL migrations to public directory...')
      
      try {
        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true })
        
        // Check if source exists
        try {
          await fs.access(sourceDir)
        } catch {
          logger.warn('No PostgreSQL migrations found, skipping copy')
          return
        }
        
        // Copy all .sql files
        const files = await fs.readdir(sourceDir)
        let copiedCount = 0
        
        for (const file of files) {
          if (file.endsWith('.sql')) {
            const sourcePath = join(sourceDir, file)
            const targetPath = join(targetDir, file)
            
            await fs.copyFile(sourcePath, targetPath)
            copiedCount++
            logger.debug(`Copied: ${file}`)
          }
        }
        
        // Also copy meta directory if exists
        const metaSourceDir = join(sourceDir, 'meta')
        const metaTargetDir = join(targetDir, 'meta')
        
        try {
          await fs.access(metaSourceDir)
          await fs.mkdir(metaTargetDir, { recursive: true })
          
          const metaFiles = await fs.readdir(metaSourceDir)
          for (const file of metaFiles) {
            const sourcePath = join(metaSourceDir, file)
            const targetPath = join(metaTargetDir, file)
            await fs.copyFile(sourcePath, targetPath)
            logger.debug(`Copied meta: ${file}`)
          }
        } catch {
          logger.debug('No meta directory found')
        }
        
        logger.success(`Copied ${copiedCount} migration files to public/.data/db/migrations/postgresql/`)
      } catch (error) {
        logger.error('Failed to copy migrations:', error)
      }
    })
    
    // Also copy in dev mode (when files change)
    nuxt.hooks.hook('builder:watch', async (_event, path) => {
      if (path.includes('server/db/migrations/postgresql') && path.endsWith('.sql')) {
        logger.info('Migration file changed, copying...')
        
        const fileName = path.split('/').pop()
        if (fileName) {
          const sourcePath = join(sourceDir, fileName)
          const targetPath = join(targetDir, fileName)
          
          try {
            await fs.copyFile(sourcePath, targetPath)
            logger.success(`Updated: ${fileName}`)
          } catch (error) {
            logger.error(`Failed to copy ${fileName}:`, error)
          }
        }
      }
    })
  },
})
