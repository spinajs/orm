/**
 * Allowed query methods and types. 
 */
export enum QueryMethod {

    /**
     * Select method eg. SELECT * FROM users
     */
    SELECT,

    /**
     * Insert method eg. INSERT INTO
     */
    INSERT,

    /**
     * UPDATE method eg. UPDATE ...
     */
    UPDATE,

    /**
     * DELETE method eg. DELETE FROM users
     */
    DELETE,

    /**
     * WHERE method used to specify conditions in other methods eg. WHERE foo = 1 AND bar = 2
     */
    WHERE,

    /**
     * SCHEMA builder query eg. CREATE TABLE ...
     */
    SCHEMA
}


/**
 * Logical operators used in queries
 */
export enum WhereBoolean {
    AND = "and",
    OR = "or"
}

/**
 * Allowed operators in queries
 */
export enum WhereOperators {
    LT = "<",
    LTE = "<=",
    GT = ">",
    GTE = ">=",
    NOT = "!=",
    EQ = "=",
    IN = "in",
    NOT_IN = "not in",
    NULL = "is null",
    NOT_NULL = "is not null",
    BETWEEN = "between",
    NOT_BETWEEN = "not between",
}


/**
 * Allowed join methods in queries
 */
export enum JoinMethod {
    INNER = "INNER JOIN",
    LEFT = "LEFT JOIN",
    LEFT_OUTER = "LEFT OUTER JOIN",
    RIGHT = "RIGHT JOIN",
    RIGHT_OUTER = "RIGHT OUTER JOIN",
    FULL_OUTER = "FULL OUTER JOIN",
    CROSS = "CROSS JOIN"
}

/**
 * Default column methods. For other methods user raw queries.
 */
export enum ColumnMethods {
    MIN = "MIN",
    MAX = "MAX",
    SUM = "SUM",
    AVG = "AVG",
    COUNT = "COUNT"
}

/**
 * Allowed column types
 */
export enum ColumnType {
    SMALL_INTEGER = "smallint",
    TINY_INTEGER = "tinyint",
    MEDIUM_INTEGER = "mediumint",
    INTEGER = "int",
    BIG_INTEGER = "bigint",
    TINY_TEXT = "tinytext",
    MEDIUM_TEXT = "mediumtext",
    LONG_TEXT = "longtext",
    TEXT = "text",
    STRING = "string",
    FLOAT = "float",
    DECIMAL = "decimal",
    BOOLEAN = "boolean",
    BIT = "bit",
    DOUBLE = "double",
    DATE = "date",
    TIME = "time",
    DATE_TIME = "dateTime",
    TIMESTAMP = "timestamp",
    ENUM = "enum",
    JSON = "json"
}

export enum SORT_ORDER {
    ASC = 'ASC',
    DESC = 'DESC'
}