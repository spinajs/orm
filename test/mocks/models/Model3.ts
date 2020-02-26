import { Connection, Primary,  Model, Archived, CreatedAt, UpdatedAt, SoftDelete } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("sqlite")
@Model("TestTable3")
// @ts-ignore
export class Model3 extends ModelBase<Model3>
{
    @Primary()
    public Id: number;

    public Foo : Map<string, string> = new Map<string, string>();
}
