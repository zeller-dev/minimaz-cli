import { log } from 'console'
import {
    removeDistDir
} from '../index.js'

export async function clear(): Promise<void> {
    removeDistDir()
}