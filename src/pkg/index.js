import { readFileSync } from 'fs'

const schema = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url)))

console.log({schema})
