import { Construct } from 'constructs';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface LambdaConfig{
  serviceName: string,
  functionname: string,
  vpc: ec2.Vpc,
  lambdaEnv: {[key : string]: string},
  stackProps?: StackProps,
}

export class LambdaConstructStack extends Stack {

  constructor(scope: Construct, id: string, config: LambdaConfig) {
    super(scope, id, config.stackProps);

    //환경변수에 리전 정보 추가
    config.lambdaEnv.REGION = Stack.of(this).region;
    config.lambdaEnv.AVAILABILITY_ZONES = JSON.stringify(
      Stack.of(this).availabilityZones,
    )
    
    const func = new lambda.Function(this, 'lambdaFunction', {
      functionName: config.functionname,
      vpc: config.vpc,
      //vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_ISOLATED},
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      handler: 'index.main',
      code: lambda.Code.fromAsset('src/lambda'),
      environment: config.lambdaEnv,
    });

    func.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'));
  }

}
  