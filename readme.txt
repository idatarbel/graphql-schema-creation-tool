This NodeJS application generates and then starts a GraphQL backend (Postgres database connection and GraphQL schema file). 

To set this program up, do the following:
1. Make a copy of the sample.env file in the root directory and name the copy .env.  
2. Update the .env with configuration based on your Postgres database instance.
3. Run the following commands:
npm install
npm run generate
4. At this point, you can access http://localhost:4000/graphql in a Web browser to get the GraphiQL query application.

This implementation does not yet handle junction tables.