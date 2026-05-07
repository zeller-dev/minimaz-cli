/**
 * Represents a single bundle output.
 *
 * - outFile: final emitted file
 * - chunks: source files included in the bundle
 */
export type Bundle = {
    outFile: string
    chunks: string[]
}