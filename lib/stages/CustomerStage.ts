import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChanCustomerStack } from '../stacks/ChanCustomerStack';

export class CustomerStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const serviceName = "chan";

    new ChanCustomerStack(this, 'customer', {
      applicationName: `${serviceName}customer`,
      stackProps: {env: props?.env, stackName: `${serviceName}-customer`,},
    });

  }
}