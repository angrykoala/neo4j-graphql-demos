const amqp = require('amqplib');
const EventEmitter = require('events')

class RabbitMQPlugin {
    constructor(path) {
        this.path = path
        this.events = new EventEmitter();
        this.exchangeName = "neo4j-graphql"
    }

    async connect() {
        const connection = await amqp.connect(this.path);
        this.channel = await connection.createChannel();
        await this.channel.assertExchange(this.exchangeName, 'fanout', { // Asserts the exchange
            durable: false
        })
        const queue= await this.channel.assertQueue('', { // Create new queue for consumer (random)
            exclusive: true
        });
        const queueName=queue.queue
        this.channel.bindQueue(queueName, this.exchangeName, ''); // binds exchange and queue
        await this.channel.consume(queueName, (msg) => {
            if (msg !== null) {
                const messageBody = JSON.parse(msg.content.toString());
                this.events.emit(messageBody.event, messageBody)
                this.channel.ack(msg);
            }
        })
    }

    async publish(eventMeta) {
        this.channel.publish(this.exchangeName, '', Buffer.from(JSON.stringify(eventMeta)));
    }

}

module.exports=RabbitMQPlugin
