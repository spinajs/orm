import { Connection, Primary, Model } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";


@Connection("sqlite")
@Model("Discrimination")
// @ts-ignore
export class ModelDisc1 extends ModelBase<ModelDisc1>
{
    @Primary()
    public Id: number;
}
