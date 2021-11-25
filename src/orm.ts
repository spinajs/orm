import { Configuration } from '@spinajs/configuration';
import { AsyncModule, IContainer } from '@spinajs/di';
import { Autoinject } from '@spinajs/di';
import { Log, Logger } from '@spinajs/log';
import { ClassInfo, ListFromFiles } from '@spinajs/reflection';
import _ from 'lodash';
import {
  IDriverOptions,
  IMigrationDescriptor,
  OrmMigration,
  MigrationTransactionMode,
  IModelDescrtiptor,
} from './interfaces';
import { ModelBase, MODEL_STATIC_MIXINS, extractModelDescriptor } from './model';
import { MIGRATION_DESCRIPTION_SYMBOL, MODEL_DESCTRIPTION_SYMBOL } from './decorators';
import { OrmDriver } from './driver';
import { InvalidOperation } from '@spinajs/exceptions';
import moment from "moment";

/**
 * Used to exclude sensitive data to others. eg. removed password field from cfg
 */
const CFG_PROPS = ['Database', 'User', 'Host', 'Port', 'Filename', 'Driver', 'Name'];
const MIGRATION_TABLE_NAME = 'spinajs_migration';

export class Orm extends AsyncModule {
  @ListFromFiles('/**/!(*.d).{ts,js}', 'system.dirs.models')
  public Models: Array<ClassInfo<ModelBase<any>>>;

  @ListFromFiles('/**/!(*.d).{ts,js}', 'system.dirs.migrations')
  public Migrations: Array<ClassInfo<OrmMigration>>;

  public Connections: Map<string, OrmDriver> = new Map<string, OrmDriver>();

  public Container: IContainer;

  @Logger({ module: 'ORM' })
  protected Log: Log;

  @Autoinject()
  protected Configuration: Configuration;

  /**
   *
   * Migrates schema up ( fill function is not executed )
   *
   * @param name migration file name
   */
  public async migrateUp(name?: string): Promise<void> {
    const self = this;

    await this.executeAvaibleMigrations(
      name,
      async (migration: OrmMigration, driver: OrmDriver) => {
        const trFunction = async (driver: OrmDriver) => {
          await migration.up(driver);

          await driver
            .insert()
            .into(driver.Options.Migration?.Table ?? MIGRATION_TABLE_NAME)
            .values({
              Migration: migration.constructor.name,
              CreatedAt: new Date(),
            });
        };

        if (driver.Options.Migration?.Transaction?.Mode === MigrationTransactionMode.PerMigration) {
          await driver.transaction(trFunction);
        } else {
          await trFunction(driver);
        }

        self.Log.info(`Migration ${migration.constructor.name} success !`);
      },
      false,
    );
  }

  /**
   *
   * Migrates schema up ( fill function is not executed )
   *
   * @param name migration file name
   */
  public async migrateDown(name?: string): Promise<void> {
    const self = this;

    await this.executeAvaibleMigrations(
      name,
      async (migration: OrmMigration, driver: OrmDriver) => {
        const trFunction = async (driver: OrmDriver) => {
          await migration.down(driver);

          await driver
            .del()
            .from(driver.Options.Migration?.Table ?? MIGRATION_TABLE_NAME)
            .where({
              Migration: migration.constructor.name,
            });
        };

        if (driver.Options.Migration?.Transaction?.Mode === MigrationTransactionMode.PerMigration) {
          await driver.transaction(trFunction);
        } else {
          await trFunction(driver);
        }

        self.Log.info(`Migration down ${migration.constructor.name} success !`);
      },
      true,
    );
  }

  /**
   * This function is exposed mainly for unit testing purposes. It reloads table information for models
   * ORM always try to load table at resolve time
   */
  public async reloadTableInfo() {
    for (const m of this.Models) {
      const descriptor = extractModelDescriptor(m.type);
      if (descriptor) {
        const connection = this.Connections.get(descriptor.Connection);
        if (connection) {
          const columns = await connection.tableInfo(descriptor.TableName, connection.Options.Database);
          if (columns) {
            m.type[MODEL_DESCTRIPTION_SYMBOL].Columns = _.uniqBy(
              _.map(columns, c => {
                return _.assign(c, _.find(descriptor.Columns, { Name: c.Name }));
              }),
              'Name',
            );
          }

          for (const [key, val] of descriptor.Converters) {
            const column = (m.type[MODEL_DESCTRIPTION_SYMBOL] as IModelDescrtiptor).Columns.find(c => c.Name === key);
            if (column) {
              column.Converter = connection.Container.hasRegistered(val) ? connection.Container.resolve(val) : null;
            }
          }
        }
      }
    }
  }

  public async resolveAsync(container: IContainer): Promise<void> {
    this.Container = container;
    const migrateOnStartup = this.Configuration.get<boolean>('db.Migration.Startup', false);

    await this.createConnections();

    if (migrateOnStartup) {
      await this.prepareMigrations();
      await this.migrateUp();
    }

    await this.reloadTableInfo();
    this.applyModelMixins();
  }

  /**
   *
   * Register model to ORM programatically so ORM can see it and use it. Sometimes dynamical model discovery is not possible eg.
   * in webpack evnironment. In such case we must tell ORM manually what to load.
   *
   * NOTE: use it in ORM constructor before ORM is resolved & model list used.
   *
   * @param model model to register
   */
  protected registerModel<T extends ModelBase>(model: Class<T>) {
    this.Models.push({
      file: `${model.name}.registered`,
      name: model.name,
      type: model,
    });
  }

  /**
   *
   * Register migration to ORM programatically so ORM can see it and use it. Sometimes dynamical migration discovery is not possible eg.
   * in webpack evnironment. In such case we must tell ORM manually what to load.
   *
   * NOTE: use it in ORM constructor before ORM is resolved & migrate function used.
   *
   * @param model model to register
   */
  protected registerMigration<T extends OrmMigration>(migration: Class<T>) {
    this.Migrations.push({
      file: `${migration.name}.registered`,
      name: migration.name,
      type: migration,
    });
  }

  private async createConnections() {
    const connections = await Promise.all(
      this.Configuration.get<IDriverOptions[]>('db.Connections', [])
        .map(c => {
          return this.Container.resolve<OrmDriver>(c.Driver, [c]);
        })
        .filter(c => c !== null)
        .map(c => c.connect()),
    );

    connections.forEach(c => {
      this.Connections.set(c.Options.Name, c);
      this.Log.info(
        `Found ORM driver ${c.Options.Name} with parameters ${JSON.stringify(_.pick(c.Options, CFG_PROPS))}`,
      );
    });

    const defaultConnection = this.Configuration.get<string>('db.DefaultConnection');
    if (defaultConnection) {
      if (!this.Connections.has(defaultConnection)) {
        throw new InvalidOperation(`default connection ${defaultConnection} not exists`);
      }

      this.Connections.set('default', this.Connections.get(defaultConnection));
    }
  }

  private applyModelMixins() {
    this.Models.forEach(m => {
      // tslint:disable-next-line: forin
      for (const mixin in MODEL_STATIC_MIXINS) {
        m.type[mixin] = (MODEL_STATIC_MIXINS as any)[mixin].bind(m.type);
      }
    });
  }

  private async executeAvaibleMigrations(
    name: string,
    callback: (migration: OrmMigration, driver: OrmDriver) => Promise<void>,
    down: boolean,
  ) {
    const toMigrate = name ? this.Migrations.filter(m => m.name === name) : this.Migrations;
    const reg = /(.*)_([0-9]{4}_[0-9]{2}_[0-9]{2}-[0-9]{2}_[0-9]{2}_[0-9]{2})\.(.*)/;

    let migrations = toMigrate.map(x => {
      const match = x.file.match(reg);
      const created = moment(match[2], "YYYY_MM_DD-HH_mm_ss");

      if (!created.isValid()) {
        this.Log.warn(`Migration file ${x.file} have invalid name format ( invalid migration date )`);
        return null;
      }

      return {
        created,
        ...x
      }
    }).filter(x => x !== null).sort((a, b) => {
      if (a.created.isBefore(b.created)) {
        return -1;
      }
      return 1;
    });

    if (down) {
      migrations = migrations.reverse();
    }

    for (const m of migrations) {
      const md = (m.type as any)[MIGRATION_DESCRIPTION_SYMBOL] as IMigrationDescriptor;
      const cn = this.Connections.get(md.Connection);
      const migrationTableName = cn.Options.Migration?.Table ?? MIGRATION_TABLE_NAME;

      const exists = await cn
        .select()
        .from(migrationTableName)
        .where({ Migration: m.name })
        .first();

      if (!exists) {
        const migration = (await this.Container.resolve(m.type, [cn])) as OrmMigration;
        await callback(migration, cn);
      }
    }
  }

  private async prepareMigrations() {
    for (const [_, connection] of this.Connections) {
      const migrationTableName = connection.Options.Migration?.Table ?? MIGRATION_TABLE_NAME;

      let migrationTable = null;

      // if there is no info on migraiton table or query throws we assume table not exists
      try {
        migrationTable = await connection.tableInfo(migrationTableName);

        // tslint:disable-next-line: no-empty
      } catch { }

      if (!migrationTable) {
        await connection.schema().createTable(migrationTableName, table => {
          table
            .string('Migration')
            .unique()
            .notNull();
          table.dateTime('CreatedAt').notNull();
        });
      }
    }
  }
}
