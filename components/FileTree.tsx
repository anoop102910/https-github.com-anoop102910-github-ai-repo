import React, { useState } from 'react';
import { TreeNode } from '../types';

const FolderIconOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
);

const FolderIconClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);


interface FileTreeNodeProps {
  node: TreeNode;
  onFileSelect: (path: string) => void;
  selectedFilePath: string | null;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, onFileSelect, selectedFilePath, level }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isFolder = node.type === 'tree';
  const isSelected = selectedFilePath === node.path;

  const handleToggle = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const itemStyle = isSelected
    ? 'bg-gray-700'
    : 'hover:bg-gray-700/50';

  return (
    <div>
      <div
        onClick={handleToggle}
        className={`flex items-center cursor-pointer px-2 py-1 rounded ${itemStyle}`}
        style={{ paddingLeft: `${level * 1.25}rem` }}
        aria-expanded={isFolder ? isOpen : undefined}
      >
        {isFolder ? (isOpen ? <FolderIconOpen /> : <FolderIconClosed />) : <FileIcon />}
        <span className="truncate">{node.name}</span>
      </div>
      {isFolder && isOpen && node.children && (
        <div>
          {node.children.sort((a,b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'tree' ? -1 : 1;
          }).map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedFilePath={selectedFilePath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};


interface FileTreeProps {
  tree: TreeNode[];
  onFileSelect: (path: string) => void;
  selectedFilePath: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ tree, onFileSelect, selectedFilePath }) => {
  if (tree.length === 0) {
    return <div className="p-4 text-gray-500">No files in repository.</div>;
  }
  
  return (
    <div className="p-2 space-y-1 w-[300px]">
      {tree.sort((a,b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'tree' ? -1 : 1;
      }).map(node => (
        <FileTreeNode 
          key={node.path} 
          node={node} 
          onFileSelect={onFileSelect} 
          selectedFilePath={selectedFilePath}
          level={0}
        />
      ))}
    </div>
  );
};

export default FileTree;
