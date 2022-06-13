import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChanSellerStack } from '../stacks/ChanSellerStack';

export class SellerStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const serviceName = "chan";

    new ChanSellerStack(this, 'seller', {
      applicationName: `${serviceName}seller`,
      stackProps: {env: props?.env, stackName: `${serviceName}-seller`,},
    });

  }
}