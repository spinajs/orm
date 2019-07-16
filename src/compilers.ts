export interface CompilerOutput {
    expression: string;
    bindings: any[];
}

export interface QueryCompiler{
    compile(): CompilerOutput
}
