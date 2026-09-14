/** Minimal Node typings for CPU tests that read repository files. Avoids a @types/node dependency. */
declare module "node:fs" {
  export function readFileSync(path: string | URL): {
    subarray(
      begin?: number,
      end?: number,
    ): { toString(encoding?: string): string };
    readUInt32BE(offset: number): number;
  };
}
