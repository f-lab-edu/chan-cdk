import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChanStack } from '../stacks/ChanStack';

export class serviceRegistrationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const chanApplicaion = new ChanStack(this, 'Order', {
      env: props?.env,
    });
  }
}