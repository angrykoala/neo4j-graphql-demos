// import { createSchema, createYoga } from "graphql-yoga";
// import { createServer } from "node:http";

const { createServer } = require("http");
const { createYoga } = require("graphql-yoga");
const fs = require("fs");
const path = require("path");
const { Neo4jGraphQLSubscriptionsSingleInstancePlugin, Neo4jGraphQL } = require("@neo4j/graphql");
const neo4j = require("neo4j-driver");

const NEO4J_URL = "bolt://localhost:7687";
const NEO4J_USER = "neo4j";
const NEO4J_PASSWORD = "password";

// Load type definitions
const typeDefs = fs.readFileSync(path.join(__dirname, "typedefs.graphql"), "utf-8");

// Create Neo4j driver
const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// Magic! Load library based on the type definitions
const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver,
    plugins: {
        subscriptions: new Neo4jGraphQLSubscriptionsSingleInstancePlugin(), // Add plugin
    },
});

// Generates graphql schema and resolvers, connect to neo4j
neoSchema.getSchema().then((schema) => {
    const yoga = createYoga({
        schema,
    });

    const server = createServer(yoga);

    server.listen(4000, () => {
        console.info("Server is running on http://localhost:4000/graphql");
    });
});
