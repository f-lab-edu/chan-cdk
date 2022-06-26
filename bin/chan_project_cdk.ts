#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import envKor from '../config/envKor'
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';
import { ChanCustomerStack } from '../lib/stacks/ChanCustomerStack';
import { ChanStack } from '../lib/stacks/ChanStack';

const app = new cdk.App();

//new InfraCicdStack(app, 'InfraCicd', { env: envKor });
new ChanStack(app, 'chan', { env: envKor, stackName: 'chan' });

