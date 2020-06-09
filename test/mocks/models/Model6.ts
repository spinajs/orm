import { Connection, Primary,  Model } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("sqlite")
@Model("TestTable6")
// @ts-ignore
export class Model6 extends ModelBase<Model5>
{
    @Primary()
    public Id: number;
 
    public Property6: string;
}