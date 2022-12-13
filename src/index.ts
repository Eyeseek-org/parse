import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './config';
import { parseServer } from './parseServer';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import ngrok from 'ngrok';
import { streamsSync } from '@moralisweb3/parse-server';
// Node 
import * as Sentry from "@sentry/node";
import "@sentry/tracing";
import {IpFilter} from 'express-ipfilter';
import helmet from 'helmet';
import mongoose from 'mongoose';

export const app = express();



// TBD create route for 3rd parties
// const mongoString = process.env.DATABASE_URI
// mongoose.connect(mongoString);
// const database = mongoose.connection

app.use(helmet());

Sentry.init({
  dsn: "https://2314152500a44106b4827b94a6fef880@o1223284.ingest.sentry.io/6572305",
  tracesSampleRate: 1.0,
});

Moralis.start({
  apiKey: config.MORALIS_API_KEY,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors());

app.use(
  streamsSync(parseServer, {
    apiKey: config.MORALIS_API_KEY,
    webhookUrl: '/streams',
  }),
);

// Whitelist the following IPs
var ips = ['::ffff:127.0.0.1','::1'];

//app.use(`/server`, IpFilter(ips, {mode: 'allow'}) ,parseServer.app);
app.use(`/server`, parseServer.app);

app.get('/', (req, res) => {
  res.send('hello world')
})


const httpServer = http.createServer(app);
httpServer.listen(config.PORT, async () => {
  if (config.USE_STREAMS) {
    const url = await ngrok.connect(config.PORT);
    // eslint-disable-next-line no-console
    console.log(
      `Moralis Server is running on port ${config.PORT} and stream webhook url ${url}${config.STREAMS_WEBHOOK_URL}`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`Moralis Server is running on port ${config.PORT}.`);
  }
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
