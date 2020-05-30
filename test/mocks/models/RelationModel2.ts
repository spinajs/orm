import { Connection, Primary, Model } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("sqlite")
@Model("TestTable3")
// @ts-ignore
export class RelationModel2 extends ModelBase<Model3>
{
    @Primary()
    public Id: number;
}
