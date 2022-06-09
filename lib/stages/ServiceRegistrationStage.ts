import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import envKor from '../../config/envKor';
import { ChanOrderServiceStack } from '../stacks/ChanOrderServiceStack';
import { CommonInfraStack } from '../stacks/CommonInfraStack';

export class ServiceRegistrationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    //Common Infra
    const commonInfra = new CommonInfraStack(this, 'CommonInfra',{
      stackName: 'CommonInfraStack',
    });

    //Order Application
    const chanOrderService = new ChanOrderServiceStack(this, 'ChanOrderService', { 
      betaCidr: '10.0.0.0/16', 
      prodCidr: '10.0.100.0/16', 
      betaContainerPort: 8080,
      dbPort: 3306,
      dbAdminName: 'postgres',
      props: { env: envKor , stackName: 'ChanOrderService'}
    });

    //Delivery Application

    //User Application

    //Store Application

    //Rider Application

    //DiliveryMatching Application

    //Logistics Application


  }
}
  