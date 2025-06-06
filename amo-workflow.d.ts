// TypeScript definitions for Amo Workflow Environment
// Version 0.1.0 - Updated to match current implementation

declare namespace Amo {
  // Core result types
  interface Result {
    success: boolean;
    data?: any;
    error?: string;
  }

  interface FileResult extends Result {
    content?: string;
  }

  interface CommandResult {
    stdout: string;
    stderr: string;
    error?: string;
  }

  // File system types
  interface FileInfo {
    name: string;
    path: string;
    size: number;
    is_dir: boolean;
    mod_time: string;
    mode: string;
  }

  interface DirectoryResult extends Result {
    files?: FileInfo[];
  }

  interface SizeResult extends Result {
    size?: number;
  }

  interface PathResult extends Result {
    path?: string;
  }

  interface FindResult extends Result {
    files?: string[];
  }

  // Network types
  interface HTTPResponse {
    status_code: number;
    headers: Record<string, string>;
    body: string;
    error?: string;
  }

  interface HTTPJSONResponse extends HTTPResponse {
    data?: any;
  }

  // Options types
  interface CommandOptions {
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
    interactive?: boolean;
  }

  interface DownloadOptions {
    show_progress?: boolean;
  }

  // Progress information for downloads
  interface DownloadProgress {
    downloaded: number;
    total: number;
    percentage: number;
    speed: string;
  }
}

// File System API
declare const fs: {
  // File/Directory checks
  exists(path: string): boolean;
  isFile(path: string): boolean;
  isDir(path: string): boolean;
  info(path: string): Amo.Result;
  stat(path: string): Amo.Result; // alias

  // Directory operations
  readdir(path: string): Amo.DirectoryResult;
  list(path: string): Amo.DirectoryResult; // alias
  mkdir(path: string): Amo.Result;

  // File operations
  read(path: string): Amo.FileResult;
  readFile(path: string): Amo.FileResult; // alias
  write(path: string, content: string): Amo.Result;
  writeFile(path: string, content: string): Amo.Result; // alias
  append(path: string, content: string): Amo.Result;
  appendFile(path: string, content: string): Amo.Result; // alias
  copy(src: string, dst: string): Amo.Result;
  move(src: string, dst: string): Amo.Result;
  rename(src: string, dst: string): Amo.Result; // alias
  remove(path: string): Amo.Result;
  delete(path: string): Amo.Result; // alias
  rm(path: string): Amo.Result; // alias

  // Path operations
  join(elements: string[]): string;
  split(path: string): { dir: string; file: string };
  absolute(path: string): Amo.PathResult;
  abs(path: string): Amo.PathResult; // alias
  relative(base: string, target: string): Amo.PathResult;
  rel(base: string, target: string): Amo.PathResult; // alias
  ext(path: string): string;
  extname(path: string): string; // alias
  filename(path: string): string;
  basename(path: string): string;
  dirname(path: string): string;

  // Utilities
  size(path: string): Amo.SizeResult;
  find(root: string, pattern: string): Amo.FindResult;
  search(root: string, pattern: string): Amo.FindResult; // alias
  cwd(): Amo.PathResult;
  getcwd(): Amo.PathResult; // alias
  chdir(path: string): Amo.Result;
  cd(path: string): Amo.Result; // alias
};

// HTTP/Network API
declare const http: {
  get(url: string, headers?: Record<string, string>): Amo.HTTPResponse;
  post(url: string, body: string, headers?: Record<string, string>): Amo.HTTPResponse;
  getJSON(url: string, headers?: Record<string, string>): Amo.HTTPJSONResponse;
  downloadFile(url: string, outputPath: string, options?: Amo.DownloadOptions): Amo.HTTPResponse;
};

// Console API
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

// Core API functions
declare function getVar(key: string): string;
declare function cliCommand(
  command: string, 
  args?: string[], 
  options?: Amo.CommandOptions
): Amo.CommandResult; 