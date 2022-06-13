
import { Construct } from 'constructs';
import { StackProps, Stack } from 'aws-cdk-lib';
import { CommonStack } from './CommonStack';
import { ChanCustomerStack } from './ChanCustomerStack';

export class ChanStack extends Stack{

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);

    const serviceName = 'chan';
    
    const common = new CommonStack(this, 'common', {
      env: props?.env,
      stackName: `${serviceName}-common`,
      tags: {
        serviceName: serviceName,
      }
    })

    //1. 회원
    const customer = new ChanCustomerStack(this, 'customer', {
      applicationName: `${serviceName}customer`,
      apigateway: common.agw,
      stackProps: {env: props?.env, stackName: `${serviceName}-customer`,},
    });

    //2. 판매자

    //3. 물류

    //4. 라이더

    common.addDependency(customer);

  }
}