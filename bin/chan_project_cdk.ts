#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';
import envKor from '../config/envKor'
import { ChanOrderServiceStack } from '../lib/stacks/ChanOrderServiceStack';

const app = new cdk.App();

new InfraCicdStack(app, 'InfraCicdStack', { env: envKor });
