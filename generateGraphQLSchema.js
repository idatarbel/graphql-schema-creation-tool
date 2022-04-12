const pg = require('pg');
require('dotenv').config();
const fs = require('fs');
const { exec } = require('child_process');

var username = process.env.PGUSER;
var password = process.env.PGPASSWORD;
var host = process.env.PGHOST;
var database = process.env.PGDATABASE;
var port = process.env.PGPORT;
var tableSchema = process.env.PGSCHEMA;


const client = new pg.Client({
  user: username,
  host: host,
  database: database,
  password: password,
  port: port,
});

client.connect();


const startOfFile = `const express = require('express');
const graphqlHTTP = require('express-graphql');
const graphql = require('graphql');
const joinMonster = require('join-monster');
require('dotenv').config();

// Connect to database
const { Pool } = require('pg');

var username = process.env.PGUSER;
var password = process.env.PGPASSWORD;
var host = process.env.PGHOST;
var database = process.env.PGDATABASE;
var port = process.env.PGPORT;

const pool = new Pool({
  user: username,
  host: host,
  database: database,
  password: password,
  port: port,
});



// Define the schema\n`;

const endOfFile = `
    const schema = new graphql.GraphQLSchema({
        query: QueryRoot,
    });

    // Create the Express app
    const app = express();
        app.use('/graphql', graphqlHTTP({
        schema: schema,
        graphiql: true
    }));

    app.listen(4000);`;

function generateGraphQLSchemaOuterShell(tableSchema){
    return new Promise((resolve, reject) => {
        let sql = `select table_name, concat('const ', INITCAP(table_name), ' = new graphql.GraphQLObjectType({ 
            name: ''', INITCAP(table_name), ''', 
            fields: () => ({') first_lines
        FROM information_schema.tables
        WHERE table_schema = '` + tableSchema + `'
        order by table_name`;
        var output = [];
        client.query(sql).then(res => {
            let tables = res.rows;
            for (const table of tables) {
                let tableName = table.table_name;
                let firstLines = table.first_lines;
                output.push({
                    "table_name": tableName,
                    "first_lines": firstLines,
                    "last_lines": " \n\t\t\t}) \n\t}); \n\n\t" 
                });
            }; //for
            resolve(output);  
        }); //query
    })//new promise
    .catch(err => { console.log(err) });
}//generateGraphQLSchemaOuterShell


function generateTypeConfig(tableSchema){
    return new Promise((resolve, reject) =>{
        sql = `SELECT 
        concat('\t', initcap(tc.table_name), '._typeConfig = {
        sqlTable: ''', tc.table_schema, '.', tc.table_name, ''',
        uniqueKey: ''', c.column_name, ''',
    }\n\n') type_config
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
        JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
          AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
        WHERE constraint_type = 'PRIMARY KEY'
        and tc.table_schema = '` + tableSchema + `'`;
        client.query(sql).then(res => {
            resolve(res.rows);  
        });
    })
}

function getJoins(tableSchema){
    return new Promise((resolve, reject) => {
        var sql = ` select 
        col.table_name as primary_table,
       col.column_name fk_column,
       rel.table_name as foreign_table,
       rel.column_name as foreign_column
from information_schema.columns col
 join (select kcu.constraint_schema, 
                  kcu.constraint_name, 
                  kcu.table_schema,
                  kcu.table_name, 
                  kcu.column_name, 
                  kcu.ordinal_position,
                  kcu.position_in_unique_constraint
           from information_schema.key_column_usage kcu
           join information_schema.table_constraints tco
                on kcu.constraint_schema = tco.constraint_schema
                and kcu.constraint_name = tco.constraint_name
                and tco.constraint_type = 'FOREIGN KEY'
          ) as kcu
          on col.table_schema = kcu.table_schema
          and col.table_name = kcu.table_name
          and col.column_name = kcu.column_name
left join information_schema.referential_constraints rco
          on rco.constraint_name = kcu.constraint_name
          and rco.constraint_schema = kcu.table_schema
left join information_schema.key_column_usage rel
          on rco.unique_constraint_name = rel.constraint_name
          and rco.unique_constraint_schema = rel.constraint_schema
          and rel.ordinal_position = kcu.position_in_unique_constraint
where col.table_schema not in ('information_schema','pg_catalog')
and kcu.table_schema = '` + tableSchema + `'
order by 1, 3, 2`;

        client.query(sql).then(res => {
            let queries = res.rows;
            resolve(queries);  
        }); //query

    })//new promise
}

function generateGraphQLSchemaColumns(tableSchema, outerShell){
    return new Promise((resolve, reject) => {
        var count = 0;
        for(var i = 0; i < outerShell.length; i++){
            let tableName = outerShell[i].table_name;
            let sql=`
SELECT 
	* 
FROM (
		SELECT
		        '' id,
		        0 as join_column,
		        table_name,
		        concat('            ', c.column_name, ': { type: ',
		        case
		        when data_type = 'integer'  then
		            'graphql.GraphQLInt'
		        when data_type like '%character%' or data_type  = 'text' or data_type = 'xml' or data_type = 'uuid' then
		            'graphql.GraphQLString'
		        when data_type  like '%timestamp%' then
		            'graphql.GraphQLString'
		        when data_type  like 'boolean' then
		            'graphql.GraphQLBoolean'
		        else
		            data_type
		        end, ' }, ') column_definition
		FROM information_schema.columns c
		left join (select distinct
		    concat(ccu.table_name, ': {
		    type, : ', initcap(ccu.table_name), ',
		    sqlJoin: (tableA, tableB, args) => \` $', '{tableA}.',  kcu.column_name, ' = $', '{tableB}.', ccu.column_name, ' \`}') t,
		    kcu.column_name
		FROM
		information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
		  ON tc.constraint_name = kcu.constraint_name
		  AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage AS ccu
		  ON ccu.constraint_name = tc.constraint_name
		  AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY' 
	) a on a.column_name = c.column_name
WHERE table_schema = '` + tableSchema + `'
order by table_name, dtd_identifier
) z
union 
SELECT
	'1' id,
	1 join_column,
	primary_table table_name,
	concat('\t\t\t', foreign_table, ': {\n\t\t\t\t\t\ttype:', initcap(foreign_table), ', \n\t\t\t\t\t\tsqlJoin: (tableA, tableB, args) => \`1=1 ',
	string_agg(concat('and $','{tableA}.',fk_column, ' = $', '{tableB}.',foreign_column), ' ') , '\`\n\t\t\t\t\t},\n') joins
from (
 select 
        col.table_name as primary_table,
       col.column_name fk_column,
       rel.table_name as foreign_table,
       rel.column_name as foreign_column
from information_schema.columns col
 join (select kcu.constraint_schema, 
                  kcu.constraint_name, 
                  kcu.table_schema,
                  kcu.table_name, 
                  kcu.column_name, 
                  kcu.ordinal_position,
                  kcu.position_in_unique_constraint
           from information_schema.key_column_usage kcu
           join information_schema.table_constraints tco
                on kcu.constraint_schema = tco.constraint_schema
                and kcu.constraint_name = tco.constraint_name
                and tco.constraint_type = 'FOREIGN KEY'
          ) as kcu
          on col.table_schema = kcu.table_schema
          and col.table_name = kcu.table_name
          and col.column_name = kcu.column_name
left join information_schema.referential_constraints rco
          on rco.constraint_name = kcu.constraint_name
          and rco.constraint_schema = kcu.table_schema
left join information_schema.key_column_usage rel
          on rco.unique_constraint_name = rel.constraint_name
          and rco.unique_constraint_schema = rel.constraint_schema
          and rel.ordinal_position = kcu.position_in_unique_constraint
where col.table_schema not in ('information_schema','pg_catalog')
and kcu.table_schema = '` + tableSchema + `'
order by 1, 3, 2
)a
group by primary_table, foreign_table
order by table_name, id`;

            var columnList = [];
            client.query(sql).then(res => {
                count++;
                let columns = res.rows;

                columnList.push(columns);
                if (count == outerShell.length){
                    resolve(columnList);  
                }
            }); //client query
        }//for
    })//promise
    .catch(err => { console.log(err) });
} //generateGraphQLSchemaColumns

function generateQueries(tableSchema){
    return new Promise((resolve, reject) => {
        
        const sql = `SELECT 
        concat('\t\t', tc.table_name, ': {
                        type: ', initcap(tc.table_name), ',
                        args: { id: { type: graphql.GraphQLNonNull(graphql.', 
            case 
            when data_type = 'character varying' then 
                'GraphQLString'
            when data_type = 'integer' then 
                'GraphQLInt'
            end
            , ') } },
                        where: (TableA, args, context) => \`$','{TableA}.', ccu.column_name ,' = ', 
            case 
            when data_type = 'character varying' then 
                ''''
            end,
            '$',                 
            '{args.id}',
            case 
            when data_type = 'character varying' then 
                ''''
            end,  
            '\`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },') result
      FROM information_schema.table_constraints tc 
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE constraint_type = 'PRIMARY KEY'
      and tc.table_schema = '` + tableSchema + `'`;


        client.query(sql).then(res => {
            let queries = res.rows;
            resolve(queries);  
        }); //query
    })//new promise
    .catch(err => { console.log(err) });
}


async function getResult(tableSchema){
    generateGraphQLSchemaOuterShell(tableSchema).then(async (outerShell) => {
        let results = await generateGraphQLSchemaColumns(tableSchema, outerShell);
        let columns = results[0];
        let typeConfigList = await generateTypeConfig(tableSchema);
        var schema = startOfFile;

        for (var i = 0; i < outerShell.length; i++){            //loop through tables
           schema += "\t" + outerShell[i].first_lines + "\n";
            let thisTable = outerShell[i].table_name;
            for(var k = 0; k < columns.length; k++){            //loop through columns
                var columns_table_name = columns[k].table_name;
                if (columns_table_name == thisTable){
                    var field = columns[k].column_definition;
                    schema += "\t\t" + field + "\n";
                }
            }//for
            schema += "\t" + outerShell[i].last_lines + "\n\n";
        }//for
        
        for(var p=0; p < typeConfigList.length; p++){
            schema += typeConfigList[p].type_config;
        }

        let queries = await generateQueries(tableSchema);
        schema += `\tconst QueryRoot = new graphql.GraphQLObjectType({
            name: 'Query',
            fields: () => ({\n`;
        for (var k = 0; k < queries.length; k++){
            schema += "\t\t" + queries[k].result + "\n";
        }//for
        schema += `\n\t\t\t})
    \n\t})\n`;

        client.end();
        schema += endOfFile;

        fs.writeFile('graphQL.js', schema, err => {
            if (err) {
              console.error(err)
              return
            }
            //file written successfully
        });
        }
    );
    
}


getResult(tableSchema);

exec('npm run start')
