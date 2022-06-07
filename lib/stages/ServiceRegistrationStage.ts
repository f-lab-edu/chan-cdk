import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChanOrderServiceStack } from '../stacks/ChanOrderServiceStack';
import { CommonInfraStack } from '../stacks/CommonInfraStack';

export class ServiceRegistrationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    //Common Infra
    const commonInfra = new CommonInfraStack(this, 'CommonInfra');

    //Order Application
    const chanOrderService = new ChanOrderServiceStack(this,'ChanOrderService');

    //Delivery Application

    //User Application

    //Store Application

    //Rider Application

    //DiliveryMatching Application

    //Logistics Application


  }
}
  