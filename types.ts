export type ExplanationContextType = 'full' | 'partial';

export interface RepoInfo {
  owner: string;
  repo: string;
}

export interface GithubFile {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url:string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children?: TreeNode[];
}

export interface Explanation {
  explanation: string;
  example: string;
}

export interface Message {
  role: 'user' | 'model' | 'system-info';
  text: string;
}

export type ChatDisplayMode = 'drawer' | 'docked' | 'modal';