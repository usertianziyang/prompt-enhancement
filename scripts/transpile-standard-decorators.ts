import ts from 'typescript'

export function transpileStandardDecorators(code: string, fileName: string): string {
  return ts.transpileModule(code, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true },
  }).outputText
}
