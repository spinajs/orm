import { IWhereQueryBuilder } from "./interfaces";

export type WhereFunction = (this: IWhereQueryBuilder) => IWhereQueryBuilder;
