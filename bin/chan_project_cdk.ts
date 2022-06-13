#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import envKor from '../config/envKor'
import { ChanStack } from '../lib/stacks/ChanStack';
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';

const app = new cdk.App();

new InfraCicdStack(app, 'InfraCicd', { env: envKor });
//new ChanStack(app, 'chan', { env: envKor });

