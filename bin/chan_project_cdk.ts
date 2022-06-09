#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';
import envKor from '../config/envKor'
import { ChanOrderServiceStack } from '../lib/stacks/ChanOrderServiceStack';

const app = new cdk.App();

//new InfraCicdStack(app, 'InfraCicdStack', { env: envKor });
new ChanOrderServiceStack(app, 'ChanOrderService', { 
  betaCidr: '10.0.0.0/16', 
  prodCidr: '10.0.100.0/16', 
  betaContainerPort: 8080,
  dbPort: 3306,
  dbAdminName: 'postgres',
  props: { env: envKor }
});
