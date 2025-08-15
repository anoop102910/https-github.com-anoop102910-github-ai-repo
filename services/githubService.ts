
import { RepoInfo, GithubFile, TreeNode } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export const parseGitHubUrl = (url: string): RepoInfo | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match && match[1] && match[2]) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
};

const buildFileTree = (files: GithubFile[]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const nodeMap: Map<string, TreeNode> = new Map();

    // Sort files by path to ensure parent directories are created before their children
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
        const pathParts = file.path.split('/');
        let currentPath = '';

        pathParts.forEach((part, index) => {
            const isLastPart = index === pathParts.length - 1;
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!nodeMap.has(currentPath)) {
                const newNode: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: isLastPart ? file.type : 'tree',
                    children: isLastPart && file.type === 'blob' ? undefined : [],
                };
                nodeMap.set(currentPath, newNode);

                if (parentPath) {
                    const parentNode = nodeMap.get(parentPath);
                    parentNode?.children?.push(newNode);
                } else {
                    rootNodes.push(newNode);
                }
            }
        });
    });

    return rootNodes;
};

export const fetchRepoTree = async (owner: string, repo: string): Promise<TreeNode[]> => {
    // First, get repo info to find the default branch
    const repoDetailsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
    if (!repoDetailsRes.ok) {
        if(repoDetailsRes.status === 404) throw new Error('Repository not found. Please check the URL.');
        throw new Error(`Failed to fetch repository details. Status: ${repoDetailsRes.status}`);
    }
    const repoDetails = await repoDetailsRes.json();
    const defaultBranch = repoDetails.default_branch;

    // Repositories can exist without a default branch if they are empty.
    if (!defaultBranch) {
        return [];
    }

    // Then, fetch the file tree for the default branch
    const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);

    // For empty repositories, the tree endpoint often returns 404 or 409. Treat this as an empty file tree.
    if (treeRes.status === 404 || treeRes.status === 409) {
        return [];
    }

    if (!treeRes.ok) {
        throw new Error(`Failed to fetch repository tree. Status: ${treeRes.status}`);
    }
    const treeData = await treeRes.json();
    
    if (treeData.truncated) {
        console.warn("File tree is truncated. Some files may not be shown.");
    }
    
    // The `tree` property might be missing in some edge cases.
    // Safely return an empty array if `treeData.tree` is not an array.
    if (!Array.isArray(treeData.tree)) {
        console.warn('GitHub API response for tree did not contain a valid "tree" array. Assuming empty repository.', treeData);
        return [];
    }
    
    return buildFileTree(treeData.tree);
};

export const fetchFileContent = async (owner: string, repo: string, path: string): Promise<string> => {
    const contentRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
    if (!contentRes.ok) {
        throw new Error(`Failed to fetch file content for ${path}. Status: ${contentRes.status}`);
    }
    const contentData = await contentRes.json();
    if (contentData.encoding !== 'base64') {
        throw new Error('Unsupported file encoding received.');
    }
    
    try {
        return atob(contentData.content);
    } catch (e) {
        console.error("Failed to decode base64 content", e);
        throw new Error("Failed to decode file content.");
    }
};
