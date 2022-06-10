import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { OrderStack } from '../stacks/orderStack';

export class serviceRegistrationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const order = new OrderStack(this, 'orderStack', {
      env: props?.env,
    });

  }
}