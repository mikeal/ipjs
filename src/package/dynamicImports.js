const walk = (node, imports = new Set()) => {
  if (!node) return
  if (node.type === 'ImportExpression') {
    if (node.source.value) imports.add(node.source.value)
  }
  for (const [, value] of Object.entries(node)) {
    if (Array.isArray(value)) value.forEach(v => walk(v, imports))
    else if (typeof value === 'object') walk(value, imports)
  }
  return imports
}

export default program => [...walk(program)]
