#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';
import envKor from '../config/envKor'
import { OrderStack } from '../lib/stacks/orderStack';

const app = new cdk.App();

//new InfraCicdStack(app, 'InfraCicd', { env: envKor });
new OrderStack(app, 'orderStack', { env: envKor });

