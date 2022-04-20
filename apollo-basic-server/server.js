// Example of Apollo server with @neo4j/graphql

const fs = require('fs');
const path = require('path');
const {
    Neo4jGraphQL
} = require("@neo4j/graphql");
const {
    ApolloServer
} = require("apollo-server");
const neo4j = require("neo4j-driver");

const NEO4J_URL = "bolt://localhost:7687"
const NEO4J_USER = "neo4j"
const NEO4J_PASSWORD = "dontpanic42"

// Load type definitions
const typeDefs = fs.readFileSync(path.join(__dirname, "typedefs.graphql"), 'utf-8');

// Create Neo4j driver
const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// Magic! Load library based on the type definitions
const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver
});

// Generates graphql schema and resolvers, connect to neo4j
neoSchema.getSchema().then((schema) => {

    // To assert constraints
    // await neoSchema.assertIndexesAndConstraints({ options: { create: true }});
    const server = new ApolloServer({
        schema,
    });

    // Starts graphql server
    server.listen().then(({
        url
    }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
})
