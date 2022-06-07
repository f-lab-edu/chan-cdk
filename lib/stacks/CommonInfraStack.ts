import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';


export class CommonInfraStack extends Stack {
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Api Gateway
  }
}
