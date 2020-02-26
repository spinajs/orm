import { Connection, Primary,  Model, Archived, CreatedAt, UpdatedAt, SoftDelete } from "../../../src/decorators";
import { ModelBase } from "../../../src/model";

@Connection("sqlite")
@Model("TestTable1")
// @ts-ignore
export class Model1 extends ModelBase<Model1>
{
    @Primary()
    public Id: number;

    @Archived()
    public ArchivedAt : Date;

    @CreatedAt()
    public CreatedAt : Date;

    @UpdatedAt()
    public UpdatedAt : Date;

    @SoftDelete()
    public DeletedAt : Date;

    public Bar : string;
}
