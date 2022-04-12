const express = require('express');
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



// Define the schema
	const Chapter = new graphql.GraphQLObjectType({ 
            name: 'Chapter', 
            fields: () => ({
		            chapter_number: { type: graphql.GraphQLInt }, 
		            section_number: { type: graphql.GraphQLInt }, 
		            id: { type: graphql.GraphQLInt }, 
		            work_id: { type: graphql.GraphQLString }, 
		            description: { type: graphql.GraphQLString }, 
					work: {
						type:Work, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.work_id = ${tableB}.id`
					},

	 
			}) 
	}); 

	

	const Character = new graphql.GraphQLObjectType({ 
            name: 'Character', 
            fields: () => ({
		            id: { type: graphql.GraphQLString }, 
		            abbrev: { type: graphql.GraphQLString }, 
		            speech_count: { type: graphql.GraphQLInt }, 
		            name: { type: graphql.GraphQLString }, 
		            description: { type: graphql.GraphQLString }, 
	 
			}) 
	}); 

	

	const Character_Work = new graphql.GraphQLObjectType({ 
            name: 'Character_Work', 
            fields: () => ({
		            work_id: { type: graphql.GraphQLString }, 
		            character_id: { type: graphql.GraphQLString }, 
					character: {
						type:Character, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.character_id = ${tableB}.id`
					},

					work: {
						type:Work, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.work_id = ${tableB}.id`
					},

	 
			}) 
	}); 

	

	const Paragraph = new graphql.GraphQLObjectType({ 
            name: 'Paragraph', 
            fields: () => ({
		            paragraph_type: { type: graphql.GraphQLString }, 
		            work_id: { type: graphql.GraphQLString }, 
		            id: { type: graphql.GraphQLInt }, 
		            stem_text: { type: graphql.GraphQLString }, 
		            phonetic_text: { type: graphql.GraphQLString }, 
		            character_id: { type: graphql.GraphQLString }, 
		            chapter_number: { type: graphql.GraphQLInt }, 
		            word_count: { type: graphql.GraphQLInt }, 
		            section_number: { type: graphql.GraphQLInt }, 
		            paragraph_num: { type: graphql.GraphQLInt }, 
		            plain_text: { type: graphql.GraphQLString }, 
		            char_count: { type: graphql.GraphQLInt }, 
					chapter: {
						type:Chapter, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.chapter_number = ${tableB}.chapter_number and ${tableA}.section_number = ${tableB}.section_number and ${tableA}.work_id = ${tableB}.work_id`
					},

					work: {
						type:Work, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.work_id = ${tableB}.id`
					},

					character: {
						type:Character, 
						sqlJoin: (tableA, tableB, args) => `1=1 and ${tableA}.character_id = ${tableB}.id`
					},

	 
			}) 
	}); 

	

	const Wordform = new graphql.GraphQLObjectType({ 
            name: 'Wordform', 
            fields: () => ({
		            id: { type: graphql.GraphQLInt }, 
		            plain_text: { type: graphql.GraphQLString }, 
		            stem_text: { type: graphql.GraphQLString }, 
		            occurences: { type: graphql.GraphQLInt }, 
		            phonetic_text: { type: graphql.GraphQLString }, 
	 
			}) 
	}); 

	

	const Work = new graphql.GraphQLObjectType({ 
            name: 'Work', 
            fields: () => ({
		            title: { type: graphql.GraphQLString }, 
		            source: { type: graphql.GraphQLString }, 
		            id: { type: graphql.GraphQLString }, 
		            notes: { type: graphql.GraphQLString }, 
		            year: { type: graphql.GraphQLInt }, 
		            total_paragraphs: { type: graphql.GraphQLInt }, 
		            genre_type: { type: graphql.GraphQLString }, 
		            long_title: { type: graphql.GraphQLString }, 
		            total_words: { type: graphql.GraphQLInt }, 
	 
			}) 
	}); 

	

	Chapter._typeConfig = {
        sqlTable: 'shakespeare.chapter',
        uniqueKey: 'id',
    }

	Character._typeConfig = {
        sqlTable: 'shakespeare.character',
        uniqueKey: 'id',
    }

	Character_Work._typeConfig = {
        sqlTable: 'shakespeare.character_work',
        uniqueKey: 'character_id',
    }

	Character_Work._typeConfig = {
        sqlTable: 'shakespeare.character_work',
        uniqueKey: 'work_id',
    }

	Paragraph._typeConfig = {
        sqlTable: 'shakespeare.paragraph',
        uniqueKey: 'id',
    }

	Wordform._typeConfig = {
        sqlTable: 'shakespeare.wordform',
        uniqueKey: 'id',
    }

	Work._typeConfig = {
        sqlTable: 'shakespeare.work',
        uniqueKey: 'id',
    }

	const QueryRoot = new graphql.GraphQLObjectType({
            name: 'Query',
            fields: () => ({
				chapter: {
                        type: Chapter,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } },
                        where: (TableA, args, context) => `${TableA}.id = ${args.id}`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				character: {
                        type: Character,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLString) } },
                        where: (TableA, args, context) => `${TableA}.id = '${args.id}'`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				character_work: {
                        type: Character_Work,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLString) } },
                        where: (TableA, args, context) => `${TableA}.character_id = '${args.id}'`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				character_work: {
                        type: Character_Work,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLString) } },
                        where: (TableA, args, context) => `${TableA}.work_id = '${args.id}'`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				paragraph: {
                        type: Paragraph,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } },
                        where: (TableA, args, context) => `${TableA}.id = ${args.id}`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				wordform: {
                        type: Wordform,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } },
                        where: (TableA, args, context) => `${TableA}.id = ${args.id}`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },
				work: {
                        type: Work,
                        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLString) } },
                        where: (TableA, args, context) => `${TableA}.id = '${args.id}'`,
                        resolve: (parent, args, context, resolveInfo) => {
                                return joinMonster.default(resolveInfo, {}, sql => {
                                        return pool.query(sql)
                                })
                        }
                },

			})
    
	})

    const schema = new graphql.GraphQLSchema({
        query: QueryRoot,
    });

    // Create the Express app
    const app = express();
        app.use('/graphql', graphqlHTTP({
        schema: schema,
        graphiql: true
    }));

    app.listen(4000);