// Module resolution hook for pnpm workspace
const Module = require('module');
const path = require('path');
const fs = require('fs');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  // Try original resolution first
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    // If it fails and it's a dependency, try resolving from workspace root
    if (err.code === 'MODULE_NOT_FOUND') {
      const workspaceRoot = path.resolve(__dirname, '../../../');
      const nodeModulesPath = path.join(workspaceRoot, 'node_modules');
      
      // Try to find in pnpm structure
      const pnpmPath = path.join(nodeModulesPath, '.pnpm');
      if (fs.existsSync(pnpmPath)) {
        // Look for the package in .pnpm
        try {
          const entries = fs.readdirSync(pnpmPath);
          for (const entry of entries) {
            if (entry.startsWith(`${request}@`)) {
              const packagePath = path.join(pnpmPath, entry, 'node_modules', request);
              if (fs.existsSync(packagePath)) {
                try {
                  const packageJsonPath = path.join(packagePath, 'package.json');
                  if (fs.existsSync(packageJsonPath)) {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    const mainFile = packageJson.main || packageJson.module || 'index.js';
                    const resolvedPath = path.resolve(packagePath, mainFile);
                    if (fs.existsSync(resolvedPath)) {
                      return resolvedPath;
                    }
                    // Try index.cjs or index.js
                    for (const ext of ['index.cjs', 'index.js', 'index.mjs']) {
                      const altPath = path.join(packagePath, ext);
                      if (fs.existsSync(altPath)) {
                        return altPath;
                      }
                    }
                  }
                } catch (e) {
                  // Continue searching
                }
              }
            }
          }
        } catch (e) {
          // Continue to throw original error
        }
      }
    }
    throw err;
  }
};
