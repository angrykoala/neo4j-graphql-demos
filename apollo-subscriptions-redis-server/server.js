const fs = require('fs');
const path = require('path');
const { createServer } = require("http");
const { EventEmitter } = require('events');
const neo4j = require('neo4j-driver');
const { Neo4jGraphQL } = require('@neo4j/graphql');
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const express = require('express');
const  { ApolloServer } = require("apollo-server-express");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");
const { createClient } = require('redis');

const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));


// redis Subscriptions
class CustomRedisPlugin {
    constructor(redisClient) {
        this.client = redisClient;
        this.subscriber = this.client.duplicate()
        this.publisher = this.client.duplicate();
        this.events = new EventEmitter();
    }

    async connect(){
        await this.client.connect();
        await this.subscriber.connect();
        await this.publisher.connect();

        await this.subscriber.subscribe("graphql-subscriptions", (message) => {
          const eventMeta = JSON.parse(message);
          this.events.emit(eventMeta.event, eventMeta);
        });
    }

    async publish(eventMeta) {
        await this.publisher.publish("graphql-subscriptions", JSON.stringify(eventMeta))
    }
}

const NEO4J_URL = "bolt://localhost:7687"
const NEO4J_USER = "neo4j"
const NEO4J_PASSWORD = "dontpanic42"

// Load type definitions
const typeDefs = fs.readFileSync(path.join(__dirname, "typedefs.graphql"), 'utf-8');


const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));


async function main() {
    const subscriptionsPlugin=new CustomRedisPlugin(client)
    await subscriptionsPlugin.connect();

    const neoSchema = new Neo4jGraphQL({
        typeDefs: typeDefs,
        driver,
        plugins: {
            subscriptions: subscriptionsPlugin, // Add plugin
        },
    });

    // Apollo server setup
    const app = express();
    const httpServer = createServer(app);

    // Setup websocket server on top of express http server
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });

    // Build Neo4j/graphql schema
    const schema = await neoSchema.getSchema();
    const serverCleanup = useServer({
        schema
    }, wsServer);

    const server = new ApolloServer({
        schema,
        plugins: [
            ApolloServerPluginDrainHttpServer({
                httpServer
            }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
    });
    await server.start();
    server.applyMiddleware({
        app
    });

    const PORT = 4000;
    httpServer.listen(PORT, () => {
        console.log(`Server is now running on http://localhost:${PORT}/graphql`);
    });
}

main();
