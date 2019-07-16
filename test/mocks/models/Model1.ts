import { Connection, PrimaryKey, SoftDelete, TableName, Timestamps } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("SampleConnection1")
@TableName("Table1")
@Timestamps("created","updated")
@SoftDelete("deleted")
@PrimaryKey("pkey")
export class Model1 extends ModelBase
{

}