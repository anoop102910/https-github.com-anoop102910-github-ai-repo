/**
 * Resolves a module import path to an absolute path within the repository.
 *
 * @param importPath The relative path from the import statement (e.g., './utils', '../components/Button').
 * @param currentFilePath The absolute path of the file containing the import.
 * @param allFilePaths A flat array of all file paths in the repository.
 * @returns The resolved absolute path, or null if not found.
 */
export function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  allFilePaths: string[]
): string | null {
  // Ignore absolute URLs or paths that are not relative
  if (!importPath.startsWith('.')) {
    return null;
  }

  // Get the directory of the current file
  const currentDirectory = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));

  // Use URL to easily resolve relative paths like '../' and './'
  // We use a dummy base URL to leverage the URL constructor's path resolution logic.
  const resolvedPath = new URL(importPath, `file:///${currentDirectory}/`).pathname.substring(1);

  // Possible extensions to check for extensionless imports
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
  
  // Case 1: Direct match (e.g., import from './Button.tsx')
  for (const ext of extensions) {
    if (allFilePaths.includes(resolvedPath + ext)) {
      return resolvedPath + ext;
    }
  }

  // Case 2: Index file match (e.g., import from './components')
  const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const ext of indexExtensions) {
    if (allFilePaths.includes(resolvedPath + ext)) {
      return resolvedPath + ext;
    }
  }

  return null;
}
