#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import envKor from '../config/envKor'
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';

const app = new cdk.App();

new InfraCicdStack(app, 'InfraCicd', { env: envKor });
//new ChanCustomerStack(app, 'chan', { env: envKor });

