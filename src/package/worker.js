import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import astring from 'astring'

const { generate } = astring

let mod = null
if (isMainThread) {
  mod = workerData => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData })
      worker.on('message', resolve)
      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) { reject(new Error(`Worker stopped with exit code ${code}`)) }
      })
    })
  }
} else {
  parentPort.postMessage(generate(workerData))
}
export default mod
