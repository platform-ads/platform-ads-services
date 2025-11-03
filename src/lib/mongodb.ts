import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options: MongoClientOptions = {};

const client = new MongoClient(uri, options);

export { client };
