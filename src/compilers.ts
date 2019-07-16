export interface ICompilerOutput {
    expression: string;
    bindings: any[];
}

export interface IQueryCompiler{
    compile(): ICompilerOutput
}
